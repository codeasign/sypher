import { Body, Controller, Get, Post, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { PasswordResetTokenRepository } from '../repositories/PasswordResetTokenRepository';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  buildClearedCookieHeader,
  buildSetCookieHeader,
  generateResetToken,
  generateSessionToken,
  hashToken,
  OAUTH_STATE_COOKIE_NAME,
  sessionExpiry,
} from '../lib/session';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../lib/email';
import { buildGoogleAuthUrl, exchangeGoogleCode } from '../lib/googleOAuth';
import { env } from '../lib/env';
import { createLogger } from '../lib/logger';

const logger = createLogger('AuthController');
const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();
const resetTokenRepository = new PasswordResetTokenRepository();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const OAUTH_STATE_TTL_SECONDS = 300;

interface AuthRegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

interface AuthLoginRequest {
  email: string;
  password: string;
}

interface AuthForgotPasswordRequest {
  email: string;
}

interface AuthResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
  paidUntil: string | null;
}

interface AuthMessageResponse {
  message: string;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    companyId: user.companyId,
    paidUntil: user.paidUntil ? user.paidUntil.toISOString() : null,
  };
}

async function createSessionAndCookie(user: User, request: ExpressRequest): Promise<string> {
  const token = generateSessionToken();
  await sessionRepository.create({
    userId: user.id,
    token,
    expiresAt: sessionExpiry(),
    userAgent: request.headers['user-agent'] ?? null,
  });
  return buildSetCookieHeader(env.sessionCookieName, token, env.sessionTtlDays * 24 * 60 * 60);
}

@Route('auth')
@Tags('Auth')
export class AuthController extends Controller {
  @Post('register')
  public async register(
    @Body() body: AuthRegisterRequest,
    @Request() request: ExpressRequest,
    @Res() conflict: TsoaResponse<409, AuthMessageResponse>,
    @Res() badRequest: TsoaResponse<400, AuthMessageResponse>,
    @Res() created: TsoaResponse<201, AuthUser, { 'Set-Cookie': string }>,
  ): Promise<void> {
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return badRequest(400, { message: 'Invalid email address' });
    if (body.password.length < 8) return badRequest(400, { message: 'Password must be at least 8 characters' });

    const existing = await userRepository.findByEmail(email);
    if (existing) return conflict(409, { message: 'An account with this email already exists' });

    const passwordHash = await hashPassword(body.password);
    const user = await userRepository.create({
      email,
      passwordHash,
      fullName: body.fullName?.trim() || null,
      provider: 'EMAIL',
    });
    logger.info(`Registered user ${user.id}`);
    // Fire-and-forget: sendWelcomeEmail already catches/logs its own
    // failures internally, and registration must never wait on (or fail
    // because of) an external email API round-trip.
    void sendWelcomeEmail(user.email, user.fullName);

    const cookie = await createSessionAndCookie(user, request);
    return created(201, toAuthUser(user), { 'Set-Cookie': cookie });
  }

  @Post('login')
  public async login(
    @Body() body: AuthLoginRequest,
    @Request() request: ExpressRequest,
    @Res() unauthorized: TsoaResponse<401, AuthMessageResponse>,
    @Res() ok: TsoaResponse<200, AuthUser, { 'Set-Cookie': string }>,
  ): Promise<void> {
    const email = body.email.trim().toLowerCase();
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      return unauthorized(401, { message: 'Invalid email or password' });
    }
    const valid = await verifyPassword(user.passwordHash, body.password);
    if (!valid) return unauthorized(401, { message: 'Invalid email or password' });

    const cookie = await createSessionAndCookie(user, request);
    return ok(200, toAuthUser(user), { 'Set-Cookie': cookie });
  }

  @Post('logout')
  public async logout(
    @Request() request: ExpressRequest,
    @Res() noContent: TsoaResponse<204, void, { 'Set-Cookie': string }>,
  ): Promise<void> {
    const token = request.cookies?.[env.sessionCookieName];
    if (token) await sessionRepository.deleteByToken(token);
    return noContent(204, undefined, { 'Set-Cookie': buildClearedCookieHeader(env.sessionCookieName) });
  }

  @Get('me')
  @Security('session')
  public async me(@Request() request: ExpressRequest): Promise<AuthUser> {
    return toAuthUser(request.user as User);
  }

  @Post('forgot-password')
  public async forgotPassword(@Body() body: AuthForgotPasswordRequest): Promise<AuthMessageResponse> {
    const email = body.email.trim().toLowerCase();
    const user = await userRepository.findByEmail(email);
    // Always return the same message, whether or not the account exists —
    // don't let this endpoint be used to enumerate registered emails.
    if (user) {
      const rawToken = generateResetToken();
      await resetTokenRepository.create(user.id, hashToken(rawToken), new Date(Date.now() + RESET_TOKEN_TTL_MS));
      const resetLink = `${env.frontendUrl}/reset-password?token=${rawToken}`;
      // Fire-and-forget, same reasoning as register's welcome email — this
      // endpoint always returns the same message regardless of delivery
      // outcome, so blocking on an external API round-trip only adds
      // latency without changing the response.
      void sendPasswordResetEmail(user.email, resetLink);
    }
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Post('reset-password')
  public async resetPassword(
    @Body() body: AuthResetPasswordRequest,
    @Res() badRequest: TsoaResponse<400, AuthMessageResponse>,
    @Res() ok: TsoaResponse<200, AuthMessageResponse>,
  ): Promise<void> {
    if (body.newPassword.length < 8) {
      return badRequest(400, { message: 'Password must be at least 8 characters' });
    }
    const record = await resetTokenRepository.findValidByHash(hashToken(body.token));
    if (!record) return badRequest(400, { message: 'Invalid or expired reset token' });

    const passwordHash = await hashPassword(body.newPassword);
    await userRepository.setPasswordHash(record.userId, passwordHash);
    await resetTokenRepository.markUsed(record.id);
    // Reset = "I might not trust prior sessions anymore" — revoke them all.
    await sessionRepository.deleteAllForUser(record.userId);

    return ok(200, { message: 'Password has been reset. Please log in again.' });
  }

  @Get('google/start')
  public async googleStart(@Res() redirect: TsoaResponse<302, void, { Location: string; 'Set-Cookie': string }>): Promise<void> {
    const state = generateSessionToken();
    const url = buildGoogleAuthUrl(state);
    return redirect(302, undefined, {
      Location: url,
      'Set-Cookie': buildSetCookieHeader(OAUTH_STATE_COOKIE_NAME, state, OAUTH_STATE_TTL_SECONDS),
    });
  }

  @Get('google/callback')
  public async googleCallback(
    @Request() request: ExpressRequest,
    @Res() redirect: TsoaResponse<302, void, { Location: string; 'Set-Cookie'?: string }>,
    @Query() code?: string,
    @Query() state?: string,
  ): Promise<void> {
    const expectedState = request.cookies?.[OAUTH_STATE_COOKIE_NAME];
    if (!code || !state || !expectedState || state !== expectedState) {
      return redirect(302, undefined, { Location: `${env.frontendUrl}/login?error=oauth_state_mismatch` });
    }

    let profile;
    try {
      profile = await exchangeGoogleCode(code);
    } catch (error) {
      logger.error('Google code exchange failed', error);
      return redirect(302, undefined, { Location: `${env.frontendUrl}/login?error=oauth_exchange_failed` });
    }

    let user = await userRepository.findByEmail(profile.email);
    if (!user) {
      user = await userRepository.create({
        email: profile.email,
        passwordHash: null,
        fullName: profile.fullName,
        provider: 'GOOGLE',
      });
      logger.info(`Registered user ${user.id} via Google`);
    }

    const cookie = await createSessionAndCookie(user, request);
    return redirect(302, undefined, { Location: `${env.frontendUrl}/dashboard`, 'Set-Cookie': cookie });
  }
}
