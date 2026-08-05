import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Single source of truth for navbar toggles is apps/docs/.env -- load it
// here (without touching this app's own process.env via override) so
// editing that one file drives both sites' navbars. `env` below whitelists
// these into the Next.js build for both server and client code, the same
// way NEXT_PUBLIC_ vars work, without requiring the prefix or a second
// copy of the values in apps/app's own .env files.
const docsEnv = dotenv.config({ path: path.resolve(__dirname, "../docs/.env") }).parsed ?? {};

const NAVBAR_SHOW_KEYS = [
  "NAVBAR_SHOW_EXPLORE_COURSES",
  "NAVBAR_SHOW_BLOG",
  "NAVBAR_SHOW_CAREERS",
  "NAVBAR_SHOW_CORPORATE_TRAINING",
  "NAVBAR_SHOW_RESUME_REVIEW",
  "NAVBAR_SHOW_MOCK_INTERVIEW",
  "NAVBAR_SHOW_HIRE_WITH_US",
  "NAVBAR_SHOW_TEAM_ACCESS",
] as const;

const navbarEnv = Object.fromEntries(
  NAVBAR_SHOW_KEYS.map((key) => [key, docsEnv[key] ?? "true"])
);

// Same single-source-of-truth pattern as the navbar toggles above, but
// defaults to "false" (opt-in) rather than "true" (opt-out).
const SHOW_PLAN_ROLE = docsEnv.SHOW_PLAN_ROLE ?? "false";
const SHOW_PERSONAL_DETAILS = docsEnv.SHOW_PERSONAL_DETAILS ?? "false";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['app.sypher.local'],
  env: { ...navbarEnv, SHOW_PLAN_ROLE, SHOW_PERSONAL_DETAILS },
};

export default nextConfig;
