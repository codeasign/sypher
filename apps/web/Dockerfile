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
