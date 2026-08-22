import { randomBytes, createHash } from 'node:crypto';
import type { CookieOptions } from 'express';
import { env } from './env';

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000);
}

/**
 * Same shape as packages/auth-core/src/cookieConfig.js's AUTH_COOKIE_OPTIONS
 * (domain: '.sypher.local', sameSite: 'lax', secure: true) so a session set
 * here is readable across every *.sypher.local subdomain the same way the
 * old Supabase cookie was.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  domain: env.cookieDomain,
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
};

export const OAUTH_STATE_COOKIE_NAME = 'sypher_next_oauth_state';

/**
 * tsoa controllers can't use Express's res.cookie() (they only get a raw
 * headers object via @Res()), so build the Set-Cookie header string by
 * hand. maxAgeSeconds omitted -> session cookie (cleared on browser close),
 * used for the short-lived OAuth CSRF state cookie.
 */
export function buildSetCookieHeader(name: string, value: string, maxAgeSeconds?: number): string {
  const parts = [`${name}=${value}`, `Domain=${env.cookieDomain}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
  if (maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }
  return parts.join('; ');
}

export function buildClearedCookieHeader(name: string): string {
  return `${name}=; Domain=${env.cookieDomain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
