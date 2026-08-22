/** @type {import('next').NextConfig} */
const nextConfig = {
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
