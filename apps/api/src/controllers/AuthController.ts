import { Body, Controller, Get, Post, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { UserRepository, USERNAME_PATTERN } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { PasswordResetTokenRepository } from '../repositories/PasswordResetTokenRepository';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { isCompanyAccessActive } from '../lib/companyAccess';
import { HttpError } from '../lib/errors';
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
const companyRepository = new CompanyRepository();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const OAUTH_STATE_TTL_SECONDS = 300;

// The onboarding avatarUrl is stored and later rendered as <img src> all
// over the app, so it must be one of exactly two things: a bundled preset
// path, or an HTTPS URL on our own Bunny pull zone (i.e. something that
// actually came out of uploadToBunny). Anything else — data:, javascript:,
// arbitrary external hosts — is rejected before it can be persisted.
const PRESET_AVATAR_RE = /^\/avatars\/avatar-(0[1-9]|10)\.svg$/;

function isAllowedAvatarUrl(value: string): boolean {
  if (PRESET_AVATAR_RE.test(value)) return true;
  if (!env.bunny.pullZoneUrl) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return url.hostname === new URL(env.bunny.pullZoneUrl).hostname;
  } catch {
    return false;
  }
}

interface AuthRegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

interface AuthLoginRequest {
  email: string;
  password: string;
}

interface AuthCompanyLoginRequest {
  email: string;
  password: string;
  /** Human business code the visitor entered on the corporate portal. */
  companyCode: string;
}

interface AuthForgotPasswordRequest {
  email: string;
}

interface AuthResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface AuthOnboardRequest {
  /** Chosen handle — lowercase [a-z0-9_], 3–20 chars. */
  username: string;
  /** A preset avatar path (/avatars/*.svg) or an uploaded image URL. */
  avatarUrl: string;
  /** Must be true — acceptance of Terms, Privacy Policy and Refund Policy. */
  acceptedLegal: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  companyId: string | null;
  paidUntil: string | null;
  /** true → the client must route to set-password before anything else. */
  mustResetPassword: boolean;
  /** null → the app-wide first-login onboarding modal must be completed. */
  onboardedAt: string | null;
}

interface AuthMessageResponse {
  message: string;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    companyId: user.companyId,
    paidUntil: user.paidUntil ? user.paidUntil.toISOString() : null,
    mustResetPassword: user.mustResetPassword,
    onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
  };
}

async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await userRepository.findByEmail(email.trim().toLowerCase());
  if (!user || !user.passwordHash) return null;
  return (await verifyPassword(user.passwordHash, password)) ? user : null;
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
    const user = await authenticate(body.email, body.password);
    if (!user) return unauthorized(401, { message: 'Invalid email or password' });

    // ── Portal-only enforcement hook (not built — see decision 3, 2026-08-27) ──
    // If corporate accounts must be forced through corporate.sypher.local
    // instead of this open login, the gate would go HERE: after a
    // successful `authenticate`, if `user.role` is COMPANY_EMPLOYEE /
    // COMPANY_HR, either reject with a "use your company portal" message
    // or 302 to the portal. Left open deliberately — the real requirements
    // (reject vs redirect, and how it interacts with /reset-password links
    // and the Google OAuth callback below, which also call
    // createSessionAndCookie) aren't defined yet. The twin hook for the
    // OAuth path is commented in `googleCallback`.

    const cookie = await createSessionAndCookie(user, request);
    return ok(200, toAuthUser(user), { 'Set-Cookie': cookie });
  }

  /**
   * Corporate-portal login (corporate.sypher.local). Same credential check
   * as `login`, plus: the account must belong to the company whose code
   * was entered, and that company's access window must still be open. The
   * session cookie is set ONLY on full success — a valid password for an
   * account that isn't part of this company never gets a session here
   * (they can still use the open /auth/login). `companyCode` is
   * re-resolved server-side; the client-supplied company id is not trusted.
   */
  @Post('login/company')
  public async loginCompany(
    @Body() body: AuthCompanyLoginRequest,
    @Request() request: ExpressRequest,
    @Res() unauthorized: TsoaResponse<401, AuthMessageResponse>,
    @Res() forbidden: TsoaResponse<403, AuthMessageResponse>,
    @Res() ok: TsoaResponse<200, AuthUser, { 'Set-Cookie': string }>,
  ): Promise<void> {
    const code = (body.companyCode ?? '').trim().toUpperCase();
    const company = code ? await companyRepository.findByBusinessId(code) : null;
    if (!company) return unauthorized(401, { message: 'Unknown company code. Start again from the company screen.' });

    const user = await authenticate(body.email, body.password);
    if (!user) {
      // Point a not-yet-onboarded employee at their set-password link
      // instead of a bare "invalid password". Safe to be specific here —
      // the company code already gates this endpoint.
      const pending = await userRepository.findByEmail(body.email);
      if (pending && pending.companyId === company.id && pending.passwordHash === null) {
        return unauthorized(401, {
          message: "Your account isn't set up yet. Use the “set your password” link in your welcome email, then sign in.",
        });
      }
      return unauthorized(401, { message: 'Invalid email or password' });
    }

    if (user.companyId !== company.id) {
      return forbidden(403, { message: `This account isn't part of ${company.name}.` });
    }
    if (!(await isCompanyAccessActive(company.id))) {
      return forbidden(403, { message: `${company.name}'s Sypher access has expired. Contact your administrator.` });
    }

    const cookie = await createSessionAndCookie(user, request);
    return ok(200, toAuthUser(user), { 'Set-Cookie': cookie });
  }

  /**
   * Set the signed-in user's password — ONLY while they are in the forced
   * first-login state (`mustResetPassword`). That state only exists for an
   * account an admin created with a temporary password; a passwordless
   * provisioned account never reaches a session (it uses the emailed
   * token link instead). Once the flag is cleared this endpoint 403s, so a
   * hijacked session can't use it to change a password without knowing the
   * current one. A voluntary "change my password" flow (with a
   * `currentPassword` check via verifyPassword) is a separate endpoint,
   * not yet built.
   */
  @Post('set-password')
  @Security('session')
  public async setPassword(
    @Body() body: { newPassword: string },
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, AuthMessageResponse>,
    @Res() forbidden: TsoaResponse<403, AuthMessageResponse>,
    @Res() ok: TsoaResponse<200, AuthUser>,
  ): Promise<void> {
    const user = request.user as User;
    if (!user.mustResetPassword) {
      return forbidden(403, { message: 'This account already has a password. Use “Forgot password” to change it.' });
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      return badRequest(400, { message: 'Password must be at least 8 characters' });
    }
    const passwordHash = await hashPassword(body.newPassword);
    await userRepository.setPasswordHash(user.id, passwordHash);
    const fresh = (await userRepository.findById(user.id)) as User;
    return ok(200, toAuthUser(fresh));
  }

  /**
   * First-login onboarding — required once, for every account, on both the
   * main and corporate hosts. Sets the user's handle + avatar and records
   * acceptance of the Terms, Privacy Policy and Refund Policy in one write.
   * Blocked in the UI by an app-wide modal until this succeeds.
   */
  @Post('onboard')
  @Security('session')
  public async onboard(
    @Body() body: AuthOnboardRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, AuthMessageResponse>,
    @Res() conflict: TsoaResponse<409, AuthMessageResponse>,
    @Res() ok: TsoaResponse<200, AuthUser>,
  ): Promise<void> {
    const user = request.user as User;
    const handle = (body.username ?? '').trim().toLowerCase();
    const avatarUrl = (body.avatarUrl ?? '').trim();

    if (!USERNAME_PATTERN.test(handle)) {
      return badRequest(400, { message: 'Handle must be 3–20 characters: lowercase letters, numbers, or underscores.' });
    }
    if (!avatarUrl || avatarUrl.length > 2048 || !isAllowedAvatarUrl(avatarUrl)) {
      return badRequest(400, { message: 'Pick an avatar or upload a picture.' });
    }
    if (body.acceptedLegal !== true) {
      return badRequest(400, { message: 'You must accept the Terms, Privacy Policy and Refund Policy to continue.' });
    }

    // A taken handle held by someone ELSE is a conflict; re-submitting the
    // user's own current handle is fine.
    const holder = await userRepository.findByUsername(handle);
    if (holder && holder.id !== user.id) {
      return conflict(409, { message: 'That handle is already taken.' });
    }

    try {
      const fresh = await userRepository.completeOnboarding(user.id, handle, avatarUrl);
      return ok(200, toAuthUser(fresh));
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        return conflict(409, { message: error.message });
      }
      throw error;
    }
  }

  /** Live handle-availability check for the onboarding modal. */
  @Get('handle-available')
  @Security('session')
  public async handleAvailable(@Query() handle: string, @Request() request: ExpressRequest): Promise<{ available: boolean; valid: boolean }> {
    const normalized = (handle ?? '').trim().toLowerCase();
    const valid = USERNAME_PATTERN.test(normalized);
    if (!valid) return { available: false, valid: false };
    const holder = await userRepository.findByUsername(normalized);
    const me = request.user as User;
    return { available: !holder || holder.id === me.id, valid: true };
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

    // ── Portal-only enforcement hook (twin of the one in `login`) ──
    // If corporate accounts must be forced through the portal, this OAuth
    // path needs its own answer: there's no company-code context in a bare
    // Google callback, so "block COMPANY_* here and 302 to the portal"
    // would likely be the shape. Not built — pending the same undefined
    // requirements. The corporate portal currently offers password login
    // only (no Google button), so a COMPANY_* user reaching this code path
    // came in via the open main login.

    const cookie = await createSessionAndCookie(user, request);
    return redirect(302, undefined, { Location: `${env.frontendUrl}/dashboard`, 'Set-Cookie': cookie });
  }
}
