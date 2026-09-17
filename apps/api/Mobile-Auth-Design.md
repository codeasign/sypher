# Mobile auth design: bearer token over the existing session

Design only — not implemented. Concrete enough to build from when we pick
it up.

## Problem

Every protected endpoint in apps/api authenticates via `expressAuthentication`
(`src/lib/tsoaAuth.ts`), which reads the httpOnly `sypher_next_session`
cookie and looks up the session row. That's correct and sufficient for
the browser clients (apps/web, the corporate portal), but an Expo/React
Native app has no persistent, automatic cookie jar the way a browser does
— `fetch` in RN doesn't retain `Set-Cookie` across app restarts, so cookie
auth doesn't work for a native client without significant, fragile
workarounds (manually managing a cookie jar library, keeping it in sync).

The fix is **not** a parallel auth system. It's a second *delivery path* for
the exact same session token, verified by the exact same lookup.

## Why reuse the `Session` table, not a new one

`expressAuthentication` already does nothing more than:

```ts
const session = await sessionRepository.findByTokenWithUser(token);
if (!session || session.expiresAt < new Date()) throw new UnauthorizedError(...);
```

The lookup is keyed on the token's *value* — it has no idea, and doesn't
need to know, whether that token arrived via a `Cookie` header or an
`Authorization` header. A mobile session is not a different kind of
session; it's the same row, delivered differently. Reusing the table means:

- **Zero schema migration required** for the core mechanism (an optional
  column is proposed below, but isn't load-bearing).
- **`deleteAllForUser`** (already called on password reset) revokes web
  *and* mobile sessions uniformly, for free — a compromised account gets
  fully logged out everywhere in one call, exactly as it should.
- **Every existing `@Security('session')` endpoint works for mobile with
  zero controller changes** — the entire ~150-endpoint surface becomes
  mobile-compatible the moment `expressAuthentication` learns to check a
  second header. This is the whole point of "extend, don't parallel-build."

## 1. Issuance — at login

`AuthController.login`, `.loginCompany`, and `.register` all call
`createSessionAndCookie(user, request)` today, which creates the `Session`
row and returns a `Set-Cookie` header string. Change:

```ts
// session.ts — new, alongside createSessionAndCookie
async function createSession(user: User, request: ExpressRequest): Promise<{ token: string; cookie: string }> {
  const token = generateSessionToken(); // unchanged — same 256-bit token generator
  await sessionRepository.create({
    userId: user.id,
    token,
    expiresAt: sessionExpiry(),
    userAgent: request.headers['user-agent'] ?? null,
  });
  const cookie = buildSetCookieHeader(env.sessionCookieName, token, env.sessionTtlDays * 24 * 60 * 60);
  return { token, cookie };
}
```

The controller then decides whether to hand the raw token back in the JSON
body, gated on an explicit client signal — **not** sent unconditionally, so
a browser login response doesn't carry a redundant copy of its own session
secret in the body (smaller blast radius if a response body ever ends up
somewhere it shouldn't — a proxy log, a crash-reporter breadcrumb):

```ts
// AuthController.login (loginCompany, register: same shape)
const wantsToken = request.headers['x-sypher-client'] === 'mobile';
const { token, cookie } = await createSession(user, request);
return ok(200, { ...toAuthUser(user), sessionToken: wantsToken ? token : undefined }, { 'Set-Cookie': cookie });
```

`AuthUser` gains one optional field:

```ts
interface AuthUser {
  // ...existing fields
  sessionToken?: string; // present only when the caller signaled a mobile client
}
```

The `Set-Cookie` header is still always sent — harmless no-op for a client
with no cookie jar, and it means a future RN-with-cookie-support path or a
webview-hosted flow still works unmodified.

**Client-side requirement** (Expo app, not this repo's concern to enforce,
but worth stating): the token must be stored in `expo-secure-store`
(iOS Keychain / Android Keystore), never `AsyncStorage` — it's a bearer
credential, equivalent to the session cookie's value.

## 2. Verification — extending `expressAuthentication`

```ts
// tsoaAuth.ts
function extractSessionToken(request: Request): string | null {
  const cookieToken = request.cookies?.[env.sessionCookieName];
  if (cookieToken) return cookieToken;
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    return token || null;
  }
  return null;
}

export async function expressAuthentication(request: Request, securityName: string): Promise<User> {
  if (securityName !== 'session') throw new UnauthorizedError(`Unknown security scheme: ${securityName}`);
  const token = extractSessionToken(request);
  if (!token) throw new UnauthorizedError();
  const session = await sessionRepository.findByTokenWithUser(token);
  if (!session || session.expiresAt < new Date()) throw new UnauthorizedError('Session expired or invalid');
  await sessionRepository.touch(session.id);
  return session.user;
}
```

Cookie checked first (so a browser session already logged in takes
precedence over any stray `Authorization` header) — this is the only
change every one of the ~150 `@Security('session')` endpoints needs.
`resolveOptionalUser` (used by the public-but-personalized comment reads)
gets the identical `extractSessionToken` swap for consistency.

**Also needs the same fix**: `AuthController.logout` currently reads
`request.cookies?.[env.sessionCookieName]` directly instead of going
through the shared extractor — a bearer-only caller's logout would
silently no-op today. Route it through `extractSessionToken` too.

## 3. Revocation

No new mechanism — the existing three paths already cover it, and now
cover mobile automatically because it's the same table:

- **Logout**: `sessionRepository.deleteByToken(token)` — works identically
  regardless of whether `token` arrived via cookie or bearer header, once
  `logout` is updated per above.
- **Password reset**: `sessionRepository.deleteAllForUser(userId)` — already
  called in `resetPassword`; now correctly revokes mobile sessions too,
  with no change needed.
- **Expiry**: `session.expiresAt`, checked on every lookup. Note this is a
  **fixed TTL from creation** (`sessionTtlDays`, 30 days by default) —
  `touch()` only updates `lastSeenAt` for observability, it does not extend
  `expiresAt`. A mobile session issued today will hard-expire in 30 days
  regardless of app usage, same as web. That's an acceptable v1 behavior
  (matches current web behavior exactly) but means the mobile client must
  handle "silently logged out after a month" by re-prompting login — there
  is no refresh-token flow in this design. If that UX turns out to be too
  aggressive for a native app people expect to stay logged into indefinitely,
  the follow-up is a proper refresh-token rotation scheme, deliberately
  scoped out here.

## Optional (not required for v1): a `clientType` column

If it later becomes useful to (a) give mobile sessions a different TTL than
web, or (b) let a user's account-settings screen show/revoke "this device"
vs "all mobile sessions" separately from web sessions:

```prisma
model Session {
  // ...existing fields
  clientType String @default("web") // "web" | "mobile"
}
```

Set from the same `x-sypher-client` signal at creation. Not needed to ship
the core bearer-token path — call this out explicitly as a later decision,
not a blocker.

## What this deliberately does not solve

- **Google OAuth on mobile** — the current flow is a cookie-based CSRF
  state + 302 redirect to `env.frontendUrl`, which assumes a browser
  navigating. A native client needs its own flow (`expo-auth-session` /
  `AuthSession` with a custom redirect URI), landing on the *same*
  `createSession`-issued token once Google's identity is resolved — but the
  redirect mechanics themselves need a separate design, not covered here.
- **Silent token refresh** — out of scope per the fixed-TTL note above.
- **CSRF** — not reintroduced by this design. CSRF exploits the *browser's*
  automatic, ambient attachment of cookies to cross-site requests; a bearer
  token sent explicitly in an `Authorization` header by app code is never
  attached automatically by anything, so the mobile path is not vulnerable
  to it and needs no CSRF token of its own. The existing `SameSite=Lax`
  cookie protection for the web path is unaffected by any of this.
