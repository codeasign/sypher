import { env } from './env';

// An avatarUrl is stored and later rendered as <img src> across the app, so
// it must be one of exactly two things: a bundled preset path, or an HTTPS
// URL on our own Bunny pull zone (i.e. something that actually came out of
// uploadToBunny). Anything else — data:, javascript:, arbitrary external
// hosts — is rejected before it can be persisted. Mirrors the check in
// AuthController.onboard (kept there too so the login path has no new import
// surface).
const PRESET_AVATAR_RE = /^\/avatars\/avatar-(0[1-9]|10)\.svg$/;

export function isAllowedAvatarUrl(value: string): boolean {
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
