# syntax=docker/dockerfile:1
#
# apps/web production image. Build context is the REPO ROOT — same npm
# workspaces reasoning as apps/api/Dockerfile's header comment, plus this
# app genuinely imports from packages/auth-core, packages/career-tools, and
# packages/course-catalog at build time, so their real source (not just
# package.json) has to be in the build context too.
#
# Build from repo root:
#   docker build -f apps/web/Dockerfile -t sypher-web \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
#     --build-arg NEXT_PUBLIC_RECAPTCHA_SITE_KEY=xxx .
#
# NEXT_PUBLIC_* vars are inlined into the client JS bundle at BUILD time,
# not read at container start — they have to be passed as --build-arg here,
# unlike every server-only env var (API_INTERNAL_URL, BUNNY_*, ...), which
# docker-compose.yml injects normally at container runtime.

FROM node:22-bookworm-slim AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/auth-core/package.json packages/auth-core/package.json
COPY packages/career-tools/package.json packages/career-tools/package.json
COPY packages/course-catalog/package.json packages/course-catalog/package.json
RUN npm ci

COPY packages/auth-core packages/auth-core
COPY packages/career-tools packages/career-tools
COPY packages/course-catalog packages/course-catalog
COPY apps/web apps/web

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WEB_URL
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=$NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
ENV NEXT_TELEMETRY_DISABLED=1

# Guard against exactly what happened once already: NEXT_PUBLIC_API_BASE_URL
# went missing from GitHub Secrets and the build silently succeeded with an
# empty value baked into the client bundle (every browser-side API call went
# to the wrong host). NEXT_PUBLIC_API_BASE_URL / NEXT_PUBLIC_WEB_URL are
# load-bearing — the app is fundamentally broken without them — so a missing
# value fails the build outright. NEXT_PUBLIC_RECAPTCHA_SITE_KEY /
# NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY degrade gracefully (bot protection / the
# contact form just won't work), so those only warn.
RUN set -eu; \
    missing_critical=""; \
    if [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then missing_critical="$missing_critical NEXT_PUBLIC_API_BASE_URL"; fi; \
    if [ -z "$NEXT_PUBLIC_WEB_URL" ]; then missing_critical="$missing_critical NEXT_PUBLIC_WEB_URL"; fi; \
    if [ -n "$missing_critical" ]; then \
      echo "============================================================"; \
      echo "BUILD FAILED: required build-arg(s) empty/unset:$missing_critical"; \
      echo "These are baked into the client bundle at build time — an empty"; \
      echo "value means every browser-side call goes to the wrong host,"; \
      echo "silently, in production. Set them as GitHub Actions repo secrets"; \
      echo "(see .github/workflows/deploy.yml's build-args) or pass"; \
      echo "--build-arg explicitly for a local build."; \
      echo "============================================================"; \
      exit 1; \
    fi; \
    if [ -z "$NEXT_PUBLIC_RECAPTCHA_SITE_KEY" ]; then echo "WARNING: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is empty — bot protection will be disabled client-side in this image."; fi; \
    if [ -z "$NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY" ]; then echo "WARNING: NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY is empty — the contact form will not work in this image."; fi

RUN npm run build --workspace=web

# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
WORKDIR /app

# outputFileTracingRoot (next.config.js) makes this path shape predictable:
# the traced node_modules lands at the repo-root level, the app's server
# entrypoint at apps/web/server.js underneath it.
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
