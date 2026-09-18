const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker production build (2026-09-18): traces the minimal set of files
  // + node_modules this app actually needs into .next/standalone, instead
  // of shipping the whole monorepo's node_modules into the runtime image.
  // Only affects `next build`'s output shape — `next dev` (used for local
  // dev via Caddy below) is untouched by this.
  output: 'standalone',
  // Points Next's file tracing at the npm-workspaces repo root instead of
  // letting it auto-detect (which can pick the wrong ancestor in a
  // monorepo and either over- or under-trace). With this set, the
  // standalone output's structure is predictable: .next/standalone/apps/web
  // /server.js, with node_modules hoisted at .next/standalone/node_modules
  // — apps/api/Dockerfile and apps/web/Dockerfile both assume this exact
  // shape.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Without this, Next's dev server rejects the HMR WebSocket's origin
  // check when accessed via Caddy's next.sypher.local proxy (not
  // localhost) — the socket handshake fails, and per apps/app's identical
  // fix for the same setup, that leaves the client bundle stuck mid-init:
  // the page looks right (SSR HTML) but never finishes hydrating, so every
  // onClick handler on the page is silently inert. Same root cause as the
  // "clicking Sign in does nothing" report.
  allowedDevOrigins: ['next.sypher.local'],
};

module.exports = nextConfig;
