# Contributing to apps/api

Standing rules for every new or modified tsoa controller/endpoint, distilled
from the 2026-09-15 security + rate-limiting + mobile-readiness pass over
the whole controller set. Applies going forward, including the Mock Test
Simulator and Corporate Portal work already scoped but not yet built.

## 1. Security gating

- **Every endpoint touching non-public data or performing a mutation must
  carry `@Security('session')`.** A missing decorator is the default failure
  mode to check for in review — it fails silently (the endpoint just works,
  unauthenticated) rather than loudly.
- **A route with no `@Security('session')` must say why, in a comment, right
  above the decorator-free method.** "Public read" alone isn't enough —
  name what makes it safe to expose (cached catalog data, no PII, no
  mutation). See `BlogController.listPublished`, `CohortController.listPublic`
  for the pattern. Reviewers should treat an *undocumented* missing
  `@Security` as a bug, not assume it's intentional.
- **A path/body id is never itself an authorization check.** Owning a valid
  commentId/groupId/employeeId doesn't prove the caller may touch it —
  re-derive scope from `request.user` (their own id, their own `companyId`
  via `requireCompanyAdmin`, etc.) and verify the path id belongs to that
  scope in the repository call, every time. Pattern to copy:
  `CompanyAdminController` (every method calls `requireCompanyAdmin(user)`
  then re-checks the path id against that `companyId`), `BlogController
  .assertOwnsPost`, `CommentController`'s owner/moderator checks.
- **Never trust a client-supplied companyId/userId/role for anything but a
  read the current user is already independently entitled to.** Tenancy and
  role come from the session-resolved `User` row, never from the request.
- **Self-action guards**: any endpoint that lets a privileged user act on
  another account's role/access must explicitly block acting on their own
  account where doing so could be irreversible (see `AccessController
  .setUserRole` blocking self-demotion).

## 2. Rate limiting — when it's required

Required for:
- **Any unauthenticated endpoint that accepts client input** (credential
  checks, lookups, form submissions) — even with recaptcha, rate limiting is
  the backstop, not a replacement for it. Key by the relevant identity: the
  attempted account/email where one exists, IP otherwise, or both when a
  single-account guess-spray and a many-account IP-spray are both plausible
  (see `consumeLoginAllowance`'s two-bucket pattern).
- **Any authenticated endpoint that fans out to a third party on the
  caller's say-so** — email/SMS sends in particular. A per-company or
  per-user cap protects the *recipient's* inbox from a compromised or
  careless caller, not apps/api itself. (`CompanyAdminController.employees
  /import`, `resend-invite`, `invite-link` are the known gap as of this
  pass — not yet fixed.)
- **Comment/content creation** — already the pattern via
  `consumeCommentAllowance`; extend the same call to any new
  create-content endpoint (forum posts, reviews, etc.).

Not required for:
- Authenticated reads/writes scoped to the caller's own data with no
  fan-out effect (bookmarks, profile edits, vote/helpful toggles). The
  abuse ceiling is "you can spam your own row," which isn't worth the
  complexity.
- Admin-only endpoints gated to a small, trusted population — rate limiting
  adds friction with no realistic attacker population behind it.
- Public content reads already behind the `getOrSet` cache layer.

**Implementation**: use `lib/rateLimit.ts`'s `consumeAllowance(key, limit,
windowSeconds)` — DB-backed, atomic (`INSERT ... ON CONFLICT ... RETURNING`),
correct under horizontal scaling. Never add a new in-memory `Map`-based
limiter; that was the exact bug this table replaced. Key format is
`<namespace>:<identity>` (e.g. `login:${email}`, `company-invite:${companyId}`)
so limiters can't collide sharing the one table.

## 3. Mobile-auth compatibility

apps/api serves both a browser client (cookie session) and, going forward,
an Expo/React Native app (bearer token — see `Mobile-Auth-Design.md`). Rules:

- **Don't add a second, parallel auth mechanism.** Every endpoint
  authenticates through `expressAuthentication`/`@Security('session')`
  exactly as today — the cookie-vs-bearer distinction is resolved once,
  inside that function, not per-controller. If you're tempted to add a
  bespoke API-key or device-token check on a specific endpoint, don't —
  extend the session mechanism instead and raise it in review.
- **Never build a flow that assumes a browser is present**: cookie-based
  CSRF state, a 302 redirect to a web URL, reliance on `Referer`/`Origin`
  headers as an authorization signal. `AuthController`'s Google OAuth flow
  is the one existing example (state cookie + redirect to `frontendUrl`) —
  it needs its own mobile-specific design (deep-link redirect via
  `expo-auth-session`), not a bearer-token retrofit. Flag any new OAuth-style
  or redirect-based flow the same way.
- **`logout`-style endpoints must resolve the session token the same way
  `expressAuthentication` does** (cookie or bearer), not just from
  `request.cookies` directly — otherwise a bearer-authenticated client's
  logout silently no-ops.
- New endpoints don't need any special mobile handling beyond the standard
  `@Security('session')` decorator — the point of the design in
  `Mobile-Auth-Design.md` is that mobile support is free once you use the
  standard pattern.

## 4. Other standing rules

- **Cap every client-supplied array/collection input** used in a query (id
  lists, CSV rows, bulk-operation payloads) — no endpoint should let an
  authenticated caller force an unbounded `IN (...)` or an unbounded
  sequential loop. Follow the `MAX_PAGE_SIZE`/`MAX_MANAGE_PAGE_SIZE`
  convention already used for pagination.
- **Never return answer keys, secrets, or other post-completion-only data
  before the action that unlocks them.** The mock-exam
  `correctAnswer`/`explanation` split (`MockExamQuestionView` vs
  `MockAttemptResultQuestion`) is the reference pattern — a dedicated,
  narrower response DTO for the pre-completion view, with the sensitive
  fields only ever serialized from the post-completion one.
- **A comment claiming a route's authorization model ("admin, or that
  company's HR") must match the code.** If it doesn't, fix the comment or
  the code in the same change — don't leave the two disagreeing for the
  next reader to untangle.
- **Keep webhook/server-to-server endpoints outside tsoa** (plain Express
  route, raw-body signature verification, no `@Security`) rather than
  forcing them through the session model — see `paymentsWebhookHandler` for
  the pattern, including registering `express.raw()` before the global
  `express.json()` for that one path.
