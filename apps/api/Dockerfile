# syntax=docker/dockerfile:1
#
# apps/api production image. Build context is the REPO ROOT (not
# apps/api/), because this is an npm workspaces monorepo — `npm ci` needs
# the root package.json + package-lock.json, and the lockfile lists every
# app/package as a workspace, so every workspace's own package.json must
# also be present on disk or `npm ci` fails outright.
#
# Build from repo root:
#   docker build -f apps/api/Dockerfile -t sypher-api .
#
# Three stages:
#   1. builder     — full install (incl. devDependencies), Prisma client
#                    generation, tsoa spec + TypeScript build.
#   2. prod-deps   — a SEPARATE, lean `npm ci --omit=dev` scoped to the api
#                    workspace, so the shipped image never carries
#                    devDependencies (tsx, tsoa, typescript, vitest, ...) or
#                    any other workspace's dependencies (React, Next, ...).
#   3. runtime     — the image that actually ships: prod-deps' node_modules
#                    + builder's compiled dist/, non-root user, healthcheck.

FROM node:22-bookworm-slim AS builder
WORKDIR /repo

# Build tooling for argon2's node-gyp fallback (used only if no prebuilt
# binary matches this image's platform/arch — harmless no-op otherwise).
# openssl: node:*-bookworm-slim ships with NO system OpenSSL at all
# (confirmed empirically: `openssl version` fails in the bare base image) —
# without it, Prisma's engine-target auto-detection guesses wrong at
# `generate` time (see prod-deps stage's comment for the exact failure this
# caused) and the query engine binary can't load at runtime either, since
# it's dynamically linked against libssl.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Workspace manifests only first, so this layer (the slow one) is cached
# across builds that only change application source, not dependencies.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/auth-core/package.json packages/auth-core/package.json
COPY packages/career-tools/package.json packages/career-tools/package.json
COPY packages/course-catalog/package.json packages/course-catalog/package.json
RUN npm ci

COPY apps/api apps/api

# Explicit, not relying on @prisma/client's postinstall hook — makes the
# dependency on a generated client visible in the Dockerfile itself.
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=api

# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /repo

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/auth-core/package.json packages/auth-core/package.json
COPY packages/career-tools/package.json packages/career-tools/package.json
COPY packages/course-catalog/package.json packages/course-catalog/package.json
RUN npm ci --omit=dev --workspace=api

# `npm ci` above ALSO ran prisma's own postinstall (prisma is a regular
# dependency now — see apps/api/package.json), independently generating a
# client here. Overwrite it wholesale with the builder stage's — copying
# only `.prisma` (the engine binary) and leaving THIS stage's own
# `@prisma/client` (the JS wrapper) in place caused a real bug caught by
# the actual container run: the client and engine disagreed on which
# binaryTarget was generated ("Query Engine ... generated for
# debian-openssl-3.0.x [but runtime] required debian-openssl-1.1.x"), even
# though both stages use the identical base image — the two independent
# `prisma generate` invocations just aren't guaranteed to agree byte-for-
# byte. Copying BOTH directories from the SAME generate call (builder's)
# is what actually guarantees consistency.
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /repo/node_modules/@prisma/client ./node_modules/@prisma/client

# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/apps/api/package.json ./package.json

# `node` is the official Node image's built-in non-root user (uid 1000) —
# no bespoke user needed.
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# `prisma migrate deploy` is the production-safe migration command — never
# generates a new migration, never prompts, only applies what's already
# committed under prisma/migrations. Runs on every container start; a
# no-op when nothing's pending.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/server.js"]
