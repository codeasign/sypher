import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Scoped to src/ only: scripts/*.test.mjs is a pre-existing suite run
    // separately via `node --test` (Node's built-in runner, not vitest) —
    // leave it alone rather than pulling it into this run.
    include: ['src/**/*.test.ts'],
    // Rate-limit tests hit the real local Postgres (DATABASE_URL from .env)
    // to prove atomicity under actual concurrent connections — an
    // in-memory/mocked DB can't demonstrate the race is closed.
    testTimeout: 15_000,
  },
});
