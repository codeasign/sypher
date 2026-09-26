# Sypher Next — Production Deployment Reference

Single-droplet deploy: GitHub Actions builds `apps/api` and `apps/web` on
every push to `main` and pushes images to GHCR; the droplet only ever pulls
and runs them (`docker compose pull && docker compose up -d`), never builds.
Content (courses, coding problems, mock exams, blog posts) is published
separately from code — see "Publishing content" below.

## Droplet

- **Host**: `143.110.191.248`
- **User**: `deploy` (SSH key auth)
- **App directory**: `/opt/sypher`

```
/opt/sypher/
├── docker-compose.yml            # the stack: postgres, api, web, caddy
├── docker-compose.local-test.yml # override for a pre-DNS smoke test (see below)
├── Caddyfile.prod                # reverse proxy + automatic HTTPS config
├── .dockerignore                 # inert here — droplet only pulls images, never builds
├── .env                          # real secrets, chmod 600, never committed
└── (migration dump files land here transiently during a content migration)
```

`.env` mirrors the repo-root `.env.example` structure exactly — same key
names, real values filled in on the droplet only. Current keys (names only,
values are real secrets and live nowhere in git):

```
API_IMAGE, WEB_IMAGE, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB,
WEB_DOMAIN, API_DOMAIN, CORPORATE_DOMAIN, COOKIE_DOMAIN, CORS_ORIGINS,
SESSION_COOKIE_NAME, SESSION_TTL_DAYS, FRONTEND_URL, API_BASE_URL,
RECAPTCHA_SECRET_KEY, RECAPTCHA_REQUIRED, GOOGLE_CLIENT_ID,
GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, EMAIL_TRANSPORT, SMTP_*,
BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_DAILY_LIMIT, RESEND_*,
BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY, BUNNY_STORAGE_HOSTNAME,
BUNNY_PULL_ZONE_URL, BUNNY_TOKEN_AUTH_KEY, JUDGE0_*, RAZORPAY_*,
PAID_UPGRADE_*, NEW_RELIC_*, LOG_ENABLED, NEXT_PUBLIC_*, UPLOAD_MAX_*,
NAVBAR_SHOW_*
```

Production is currently live: `syphernext.com`, `api.syphernext.com`, and
`corporate.syphernext.com` all have real Let's Encrypt certs issued and
serving real traffic through Caddy.

## Initial deploy sequence (already done once — reference for a rebuild)

1. **Copy the compose files** (never the filled-in `.env`):
   ```bash
   scp docker-compose.yml Caddyfile.prod .dockerignore docker-compose.local-test.yml deploy@143.110.191.248:/opt/sypher/
   ```
2. **Create `/opt/sypher/.env` directly on the droplet** (SSH in, `nano .env`), using the repo-root `.env.example` as the structural template. `chmod 600 .env`. Only `POSTGRES_PASSWORD`, `WEB_DOMAIN`, and `API_DOMAIN` are hard-required to boot (compose's `${VAR:?...}` syntax refuses to start without them) — everything else can stay blank for an initial smoke test and be filled in before real use.
3. **Before DNS is live**, smoke-test with the local-test override, which makes Caddy serve plain HTTP on ports `8080`/`8081`/`8082` instead of attempting ACME against a non-resolving domain. Use an explicit `http://` prefix on the domain values in `.env` (`WEB_DOMAIN=http://localhost:8080`, `API_DOMAIN=http://localhost:8081`) — see the troubleshooting note below on a real inconsistency between this repo's own comments on whether the prefix is required:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.local-test.yml up -d
   curl -sf http://127.0.0.1:14000/health   # api, direct
   curl -sf http://127.0.0.1:8081/health    # api, via Caddy
   ```
4. **GHCR login and pull**:
   ```bash
   read -s CR_PAT   # a GitHub PAT with read:packages scope
   echo "$CR_PAT" | docker login ghcr.io -u <github-username> --password-stdin
   unset CR_PAT
   docker compose pull
   ```
5. **Once DNS actually points here**, edit `.env` to the real domains (`syphernext.com` / `api.syphernext.com` / `corporate.syphernext.com`) and restart **without** the local-test override:
   ```bash
   docker compose up -d
   ```
   Caddy issues real Let's Encrypt certs automatically on this restart — no separate certbot step.
6. Migrations run automatically — `apps/api`'s container `CMD` runs `prisma migrate deploy` before starting the server, every boot, so there's no separate manual migration step even on the very first run against a fresh database.

## Publishing content

New/updated courses, coding problems, mock exam banks, and blog posts are
published with the master script:

```bash
npx tsx scripts/publish-content.ts --target production --all
npx tsx scripts/publish-content.ts --target production --mock-exams
npx tsx scripts/publish-content.ts --target production --courses=<slug>
```

See the script's own header comment for the full flag list and
orchestration order, or `Migrate-Cloud.md` for a full run-book. Its
direct-DB steps need an SSH tunnel to production Postgres (production
publishes no Postgres port to the outside — `networks: [internal]` only)
— the script opens and closes this itself as a child process, on
`TUNNEL_PORT` (15432 by default), no manual `ssh -L` step required. It
still needs `postgres:` in `docker-compose.yml` on the droplet to have a
loopback port published (`127.0.0.1:5432:5432` — safe to leave published
permanently, since it's loopback-only) for that self-managed tunnel to
have anything to connect to on the droplet side.

## Safety rules

- **`DEPLOY_ENABLED`** (GitHub repo variable) gates the CD pipeline's SSH-to-droplet step — keep it `false` except when deliberately cutting over to automated deploys. The `build-and-push` job (GHCR image builds) is **not** gated by this and runs on every push to `main` regardless.
- **Never commit a real `.env`** — only `.env.example` templates are tracked. Production's `.env` exists solely on the droplet, `chmod 600`.
- **Direct-DB content scripts require the SSH tunnel above** — production Postgres has no published port by design (`networks: [internal]` only in `docker-compose.yml`).
- **`seed-corporate-test.ts` must never run against production** — it seeds a fake company (`TESTCO`) with hardcoded accounts and the literal password `"password"`. `publish-content.ts` hard-refuses to include it under `--target production`, by design, not just by omission from the orchestration list.
- Direct-DB scripts (`import-mock-exams.mjs`, `seed-coding-problems.ts`, the `fixup-coding-problem-*.ts` set) read `DATABASE_URL` from the environment — never hardcode a connection string in a new script.
- HTTP-API scripts (`import-docusaurus-course.ts`, `import-authored-course.mjs`, `check-course-import.mjs`) read `IMPORT_API_URL` / `IMPORT_ADMIN_EMAIL` / `IMPORT_ADMIN_PASSWORD` from the environment — never hardcode or interactively prompt for production credentials.
- **`IMPORT_TOOL_SECRET`** — internal-tooling-only credential, not user-facing auth. `RECAPTCHA_REQUIRED` defaults `true` in production, and none of the HTTP-API content scripts can complete `/auth/login` under that gate (a reCAPTCHA v2 token can't be generated by a CLI script — it requires a human solving a checkbox in a browser). Rather than weaken `/auth/login` itself, `apps/api/src/lib/tsoaAuth.ts` adds a second, independent tsoa security scheme (`'importTool'`), stacked as an OR alongside the normal `'session'` scheme on exactly the handful of course-management endpoints these scripts call (`/courses`, `/courses/manage/list`, `/courses/{id}` etc. — see the `@Security('importTool')` decorators in `CourseController.ts`) — `/auth/login` and `/auth/register` are completely untouched. A request carrying a matching `X-Import-Tool-Secret` header (constant-time compared, mirroring the Razorpay webhook signature check in `paymentsWebhook.ts`) resolves straight to the real `ADMIN` user named by `IMPORT_ADMIN_EMAIL` — no session, no recaptcha, no password. Treat `IMPORT_TOOL_SECRET` with the same care as `RECAPTCHA_SECRET_KEY`: long, randomly generated, only in `.env`/`scripts/.env.production` (gitignored), never committed.

## Troubleshooting

**`POSTGRES_PASSWORD` with special characters breaks `DATABASE_URL`.**
`docker-compose.yml` builds the API's connection string by interpolating
the raw env var: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/...`.
Postgres connection URLs are regular URLs — a password containing `@`,
`:`, `/`, `#`, `?`, or `%` unescaped breaks the URL's own field boundaries
(e.g. an `@` in the password is parsed as the userinfo/host separator,
silently connecting with a truncated password or failing to parse at
all). Fix: either avoid those characters when generating
`POSTGRES_PASSWORD`, or percent-encode them before writing the value into
`.env` (e.g. `@` → `%40`, `#` → `%23`).

**`NavAccess` duplicate-key collision on the content data restore.**
`apps/api`'s container seeds a handful of default `NavAccess` rows itself
on first boot (application-level bootstrap, not a Prisma migration) —
`browse-videos`, `course-audit`, `manage-course-authoring`, `manage-videos`.
A data-only `pg_restore` of a dump containing the same keys fails the
whole table's `COPY` on the first duplicate (Postgres `COPY` is
all-or-nothing per invocation on Postgres 16 — a single row conflict rolls
back every row in that table's batch). Diagnosed by comparing the source
and target table row-by-row: the seeded defaults were value-identical to
the dump's rows for every overlapping key, so the real fix was a plain
`INSERT` of just the *missing* keys, not an `ON CONFLICT` upsert or a
pre-restore `TRUNCATE`. Worth checking for on any future data migration
that touches a table an app itself seeds at boot.

**Caddy needs real DNS pointed at the droplet before it can get a
Let's Encrypt cert.** Caddy's automatic HTTPS uses the ACME HTTP-01 (or
TLS-ALPN-01) challenge, which requires the certificate authority to reach
the domain at the droplet's own IP to prove ownership — if DNS doesn't
resolve here yet, cert issuance fails outright, and it'll keep retrying
and failing on every restart until DNS is live. That's why the deploy
sequence above smoke-tests with `docker-compose.local-test.yml` before
DNS cutover, and only switches to the real domains in `.env` once DNS is
confirmed resolving.

**Known doc inconsistency, unresolved — verify empirically before relying
on either version**: `Caddyfile.prod`'s own header comment says a bare
`localhost:8080`-style address (no `http://` prefix) *still* triggers
Caddy's automatic-HTTPS logic even on a non-standard port ("confirmed the
hard way ... 'Client sent an HTTP request to an HTTPS server'"), and that
you must prefix `http://` explicitly to force plain HTTP. But
`docker-compose.local-test.yml`'s own usage comment says the bare
`localhost:8080` form (no prefix) is sufficient to get plain HTTP. These
two contradict each other and I could not find a definitive resolution in
this session — the actual production deploy went straight to real domains
before this needed resolving. Use the `http://`-prefixed form (the more
specific, "confirmed the hard way" claim) until someone actually tests
both forms against a running Caddy and fixes whichever comment is wrong.
