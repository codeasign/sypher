// Renders every wired email template to a static .html file for preview/
// reference, using the real template functions in src/lib/emailTemplates.ts
// (never hand-copied) so the previews can't drift from what's actually sent.
//
// Usage: npx tsx scripts/build-email-previews.ts
// Output: apps/api/email-templates/*.html

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  welcomeEmailHtml,
  setPasswordEmailHtml,
  passwordResetEmailHtml,
  cohortWelcomeEmailHtml,
} from '../src/lib/emailTemplates';

const outDir = join(__dirname, '..', 'email-templates');
mkdirSync(outDir, { recursive: true });

const templates: Record<string, string> = {
  'welcome.html': welcomeEmailHtml('Test User', 'https://next.sypher.local/dashboard'),
  'set-password.html': setPasswordEmailHtml('Test User', 'https://next.sypher.local/set-password?token=test-token', 'Sypher'),
  'password-reset.html': passwordResetEmailHtml('https://next.sypher.local/reset-password?token=test-token'),
  'cohort-welcome.html': cohortWelcomeEmailHtml('Test User', 'Fall 2026 Cohort', 'https://next.sypher.local/cohorts/fall-2026-cohort'),
};

for (const [filename, html] of Object.entries(templates)) {
  writeFileSync(join(outDir, filename), html, 'utf-8');
  console.log(`✓ ${filename}`);
}

console.log(`\nWrote ${Object.keys(templates).length} previews to ${outDir}`);
