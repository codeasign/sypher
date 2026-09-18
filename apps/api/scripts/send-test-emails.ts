// Sends one copy of every wired transactional email template to a single
// test inbox, so template rendering/deliverability can be eyeballed without
// walking through each real flow (signup, admin-provision, forgot-password,
// cohort add).
//
// Usage: npx tsx scripts/send-test-emails.ts [to-address]
//   Defaults to forcloudread@gmail.com if no address is given.
//
// Forces EMAIL_TRANSPORT away from 'smtp' (the local GreenMail default in
// .env) so Brevo/Resend rotation actually runs — otherwise this would just
// hit the local dev SMTP container instead of a real inbox.

// Static imports are hoisted above any top-level code in an ES module, so
// the env-var override below must happen before a *dynamic* import of
// email.ts (which pulls in env.ts, which loads dotenv) — a static import
// here would read .env's EMAIL_TRANSPORT=smtp before we get a chance to
// override it.
process.env.EMAIL_TRANSPORT = process.env.EMAIL_TRANSPORT === 'smtp' || !process.env.EMAIL_TRANSPORT
  ? 'brevo'
  : process.env.EMAIL_TRANSPORT;

const to = process.argv[2] ?? 'forcloudread@gmail.com';

async function main() {
  const {
    sendWelcomeEmail,
    sendSetPasswordEmail,
    sendPasswordResetEmail,
    sendCohortWelcomeEmail,
  } = await import('../src/lib/email');

  console.log(`Sending all template emails to ${to} (transport=${process.env.EMAIL_TRANSPORT}) ...`);

  await sendWelcomeEmail(to, 'Test User');
  console.log('✓ welcome');

  await sendSetPasswordEmail(to, 'Test User', 'https://next.sypher.local/set-password?token=test-token', 'Sypher');
  console.log('✓ set-password');

  await sendPasswordResetEmail(to, 'https://next.sypher.local/reset-password?token=test-token');
  console.log('✓ password-reset');

  await sendCohortWelcomeEmail(to, 'Test User', 'Fall 2026 Cohort', 'fall-2026-cohort');
  console.log('✓ cohort-welcome');

  console.log('Done.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
