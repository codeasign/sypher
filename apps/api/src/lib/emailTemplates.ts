// Transactional email templates. Plain inline-styled HTML in one file —
// email clients strip <style> blocks and there's no build step for mail.
// Table-based layout for Outlook's sake. To add a template: add a
// `<name>EmailHtml(...)` function here, then a `send<Name>Email(...)`
// wrapper in email.ts, then call that wrapper from the flow. See
// Email-Hookup.md at the repo root.

const BRAND = '#1e4d8c';
const INK = '#1a1a1a';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const BG = '#f4f5f7';

/** Hidden preview line shown by inbox clients next to the subject. */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${escapeHtml(text)}</div>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:8px;background:${BRAND};">
      <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`;
}

/** Shared shell: coloured canvas, centred white card, brand header, footer. */
function shell(previewText: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${BG};">
${preheader(previewText)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:28px 32px 0;">
        <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND};font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">Sypher</p>
      </td></tr>
      <tr><td style="padding:16px 32px 32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${INK};font-size:14px;line-height:1.6;">
        ${bodyHtml}
      </td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:${MUTED};font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
      Sypher — Learn by building.
    </p>
  </td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function heading(text: string): string {
  return `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:${INK};">${escapeHtml(text)}</p>`;
}

// ─── Welcome (self-serve signup — the account already has a password) ─────

export function welcomeEmailHtml(fullName: string | null, dashboardUrl: string): string {
  const name = fullName ? escapeHtml(fullName.split(' ')[0]) : null;
  return shell(
    'Your Sypher account is ready.',
    `
    ${heading(name ? `Welcome, ${name}` : 'Welcome to Sypher')}
    <p style="margin:0 0 4px;">Your account is ready. Sypher is hands-on, text-first courses — pick a track and start shipping.</p>
    ${button(dashboardUrl, 'Go to your dashboard')}
    <p style="margin:0;color:${MUTED};font-size:13px;">If a course was assigned to you, it&rsquo;ll be waiting on your dashboard.</p>
  `,
  );
}

// ─── Set password (admin-provisioned / corporate onboarding — no password yet) ─

export function setPasswordEmailHtml(fullName: string | null, link: string, orgLabel: string): string {
  const name = fullName ? escapeHtml(fullName.split(' ')[0]) : null;
  const org = escapeHtml(orgLabel);
  return shell(
    `Set your password to start using Sypher${orgLabel === 'Sypher' ? '' : ` with ${orgLabel}`}.`,
    `
    ${heading(name ? `Hi ${name}` : 'Welcome to Sypher')}
    <p style="margin:0 0 4px;">
      ${orgLabel === 'Sypher'
        ? 'An account has been created for you on Sypher.'
        : `${org} has added you to Sypher.`}
      Set a password to sign in.
    </p>
    ${button(link, 'Set your password')}
    <p style="margin:0 0 4px;color:${MUTED};font-size:13px;">This link is valid for 7 days. If it expires, use &ldquo;Forgot password&rdquo; on the sign-in screen.</p>
    <p style="margin:12px 0 0;color:${MUTED};font-size:12px;word-break:break-all;">Or paste this into your browser:<br>${escapeHtml(link)}</p>
  `,
  );
}

// ─── Password reset (forgot-password flow — the account exists) ───────────

export function passwordResetEmailHtml(resetLink: string): string {
  return shell(
    'Reset your Sypher password. This link expires in 1 hour.',
    `
    ${heading('Reset your password')}
    <p style="margin:0 0 4px;">We received a request to reset your Sypher password. This link expires in <strong>1 hour</strong>.</p>
    ${button(resetLink, 'Reset password')}
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;word-break:break-all;">Or paste this into your browser:<br>${escapeHtml(resetLink)}</p>
    <p style="margin:16px 0 0;color:${MUTED};font-size:13px;">If you didn&rsquo;t request this, you can safely ignore this email — your password won&rsquo;t change.</p>
  `,
  );
}

// ─── Cohort welcome (added to a cohort roster) ───────────────────────────

export function cohortWelcomeEmailHtml(fullName: string | null, cohortTitle: string, cohortUrl: string): string {
  const name = fullName ? escapeHtml(fullName.split(' ')[0]) : null;
  const title = escapeHtml(cohortTitle);
  return shell(
    `You've been added to ${cohortTitle}.`,
    `
    ${heading(name ? `You're in, ${name}` : "You're in")}
    <p style="margin:0 0 4px;">You&rsquo;ve been added to the <strong>${title}</strong> cohort on Sypher.</p>
    <p style="margin:0 0 4px;">Your cohort page has the schedule, materials, and the courses set for the group.</p>
    ${button(cohortUrl, `Open ${title}`)}
    <p style="margin:0;color:${MUTED};font-size:13px;">Not expecting this? Reply to let your cohort organiser know.</p>
  `,
  );
}
