// Transactional email templates.
//
// Each template is a small data spec (`EmailSpec`) rendered by one function
// into BOTH an HTML body and a plain-text body, so the two never drift and
// every send goes out as multipart/alternative. The HTML is inline-styled,
// table-based (Outlook's Word engine) and carries a `<style>` block only for
// what inline CSS can't do: dark mode and the phone layout. Clients that strip
// `<style>` still get the complete light layout from the inline styles.
//
// To add a template: add a `<name>Email(...)` function here that returns
// `renderEmail({...})`, then a `send<Name>Email(...)` wrapper in email.ts, then
// call that wrapper from the flow. See Email-Hookup.md at the repo root.

import { env } from './env';
import { SET_PASSWORD_LINK_HOURS } from './session';

export interface EmailContent {
  html: string;
  text: string;
}

interface EmailSpec {
  /** Inbox preview line, shown next to the subject. */
  preview: string;
  heading: string;
  /** Body paragraphs. `**bold**` is the only markup. */
  paragraphs: string[];
  /** The one primary action. Its raw URL is also printed as a fallback. */
  cta?: { label: string; url: string };
  /** Smaller muted lines under the action. `**bold**` allowed. */
  notes?: string[];
  /** Footer line saying why this person got the email. */
  reason: string;
  /** Adds the Terms / Privacy consent sentence to the footer. */
  consent?: string;
  /** Footer help line; `link` is the clickable part (defaults to /contact, or a mailto: `href`). */
  help?: { lead: string; link: string; href?: string };
}

const SITE_NAME = 'Sypher Next';

const SUPPORT_EMAIL = 'support@syphernext.com';

const DEFAULT_HELP: { lead: string; link: string; href?: string } = { lead: 'Questions?', link: 'Contact us' };

/** Callers pass 'Sypher' as the "no company" sentinel; it is not shown to the reader. */
const DEFAULT_ORG = 'Sypher';

// Light palette (inline defaults). Contrast on white: text 17:1, muted 6:1,
// link 5.9:1, white on the purple button 5.2:1. No pure black/white text.
const C = {
  canvas: '#f0f1f8',
  card: '#ffffff',
  band: '#13132b',
  ink: '#14141f',
  muted: '#5b6070',
  panel: '#f6f6fb',
  border: '#e4e5ee',
  link: '#0b62d6',
  action: '#9b2cf5',
  blue: '#0a84ff',
  cyan: '#04fae5',
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BRAND_FONT = `'Space Grotesk',${FONT}`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Escape, then turn `**x**` into <strong>. */
function inline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function plain(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1');
}

// Dark mode + phone layout. Apple Mail, iOS Mail, Outlook.com and Gmail (web
// and app) honour <style>; `[data-ogsc]`/`[data-ogsb]` are Outlook.com's
// dark-mode hooks. !important is required to beat the inline light styles.
const STYLE = `
    @media (prefers-color-scheme: dark) {
      .em-bg {
        background-color: #0c0c14 !important;
      }
      .em-card {
        background-color: #16161f !important;
        border-color: #2a2a3a !important;
      }
      .em-band {
        background-color: #0f0f24 !important;
      }
      .em-ink {
        color: #ececf4 !important;
      }
      .em-muted {
        color: #a0a4b8 !important;
      }
      .em-panel {
        background-color: #1d1d29 !important;
        border-color: #2a2a3a !important;
      }
      .em-link {
        color: #6cb2ff !important;
      }
    }

    [data-ogsc] .em-ink {
      color: #ececf4 !important;
    }
    [data-ogsc] .em-muted {
      color: #a0a4b8 !important;
    }
    [data-ogsc] .em-link {
      color: #6cb2ff !important;
    }
    [data-ogsb] .em-bg {
      background-color: #0c0c14 !important;
    }
    [data-ogsb] .em-card {
      background-color: #16161f !important;
    }
    [data-ogsb] .em-panel {
      background-color: #1d1d29 !important;
    }

    @media only screen and (max-width: 620px) {
      .em-pad {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }
      .em-outer {
        padding: 12px 8px !important;
      }
      .em-btn-wrap {
        width: 100% !important;
      }
      .em-btn-td {
        padding: 0 !important;
      }
      .em-btn {
        display: block !important;
        padding: 16px 20px !important;
        text-align: center !important;
      }
      .em-h1 {
        font-size: 24px !important;
      }
    }
  `;

function renderHtml(spec: EmailSpec): string {
  const year = new Date().getFullYear();
  const termsUrl = `${env.frontendUrl}/terms-and-conditions`;
  const privacyUrl = `${env.frontendUrl}/privacy-policy`;
  const contactUrl = `${env.frontendUrl}/contact`;
  const link = `color:${C.link};text-decoration:underline;`;
  const help = spec.help ?? DEFAULT_HELP;

  const paragraphs = spec.paragraphs
    .map((p) => `<p class="em-ink" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.ink};">${inline(p)}</p>`)
    .join('\n        ');

  const cta = spec.cta
    ? `<table role="presentation" class="em-btn-wrap" align="center" cellpadding="0" cellspacing="0" style="margin:8px auto 24px;">
          <tr><td class="em-btn-td" align="center" bgcolor="${C.action}" style="border-radius:10px;background:${C.action};padding:15px 32px;">
            <a class="em-btn" href="${escapeHtml(spec.cta.url)}" style="font-family:${FONT};font-size:16px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;">${escapeHtml(spec.cta.label)}</a>
          </td></tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
          <tr><td class="em-panel em-muted" style="padding:12px 14px;background:${C.panel};border:1px solid ${C.border};border-radius:8px;font-size:13px;line-height:1.5;color:${C.muted};word-break:break-all;">
            If the button doesn't work, paste this link into your browser:<br>
            <a class="em-link" href="${escapeHtml(spec.cta.url)}" style="${link}">${escapeHtml(spec.cta.url)}</a>
          </td></tr>
        </table>`
    : '';

  const notes = (spec.notes ?? [])
    .map((n) => `<p class="em-muted" style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${C.muted};">${inline(n)}</p>`)
    .join('\n        ');

  const consent = spec.consent
    ? `<p style="margin:0 0 10px;">${escapeHtml(spec.consent)} <a class="em-link" href="${termsUrl}" style="${link}">Terms and Conditions</a> and <a class="em-link" href="${privacyUrl}" style="${link}">Privacy Policy</a>.</p>`
    : '';

  // Zero-width padding so the inbox preview doesn't pull in the body text.
  const previewPad = '&#847;&zwnj;&nbsp;'.repeat(60);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(spec.heading)}</title>
<style>${STYLE}</style>
</head>
<body class="em-bg" style="margin:0;padding:0;background:${C.canvas};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${escapeHtml(spec.preview)}${previewPad}</div>
<table role="presentation" class="em-bg em-outer" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" class="em-card" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
      <tr><td class="em-band em-pad" bgcolor="${C.band}" style="padding:26px 40px;background:${C.band};">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:12px;vertical-align:middle;">
            <img src="${env.email.logoUrl}" width="40" height="40" alt="" style="display:block;border:0;outline:none;width:40px;height:40px;">
          </td>
          <td style="vertical-align:middle;font-family:${BRAND_FONT};font-size:24px;font-weight:700;letter-spacing:-0.01em;color:#ffffff;">${SITE_NAME}</td>
        </tr></table>
      </td></tr>
      <tr><td height="4" bgcolor="${C.blue}" style="height:4px;line-height:4px;font-size:0;background:${C.blue};background-image:linear-gradient(90deg,${C.blue},${C.action},${C.cyan});">&nbsp;</td></tr>
      <tr><td class="em-pad" style="padding:36px 40px 0;font-family:${FONT};">
        <h1 class="em-ink em-h1" style="margin:0 0 16px;font-family:${BRAND_FONT};font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.01em;color:${C.ink};">${escapeHtml(spec.heading)}</h1>
        ${paragraphs}
        ${cta}
        ${notes}
      </td></tr>
      <tr><td class="em-pad em-muted" style="padding:0 40px 32px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.muted};">
        <p style="margin:0 0 10px;">${escapeHtml(spec.reason)}</p>
        ${consent}
        <p style="margin:0 0 20px;">${escapeHtml(help.lead)} <a class="em-link" href="${escapeHtml(help.href ?? contactUrl)}" style="${link}">${escapeHtml(help.link)}</a>.</p>
        <p style="margin:0;">&copy; ${year} ${SITE_NAME}. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function renderText(spec: EmailSpec): string {
  const lines: string[] = [SITE_NAME, '', spec.heading, ''];
  for (const p of spec.paragraphs) lines.push(plain(p), '');
  if (spec.cta) lines.push(`${spec.cta.label}:`, spec.cta.url, '');
  for (const n of spec.notes ?? []) lines.push(plain(n));
  if (spec.notes?.length) lines.push('');
  lines.push('--', spec.reason);
  if (spec.consent) {
    lines.push(
      `${spec.consent} Terms and Conditions (${env.frontendUrl}/terms-and-conditions) and Privacy Policy (${env.frontendUrl}/privacy-policy).`,
    );
  }
  const help = spec.help ?? DEFAULT_HELP;
  lines.push(help.href ? `${help.lead} ${help.link}.` : `${help.lead} ${help.link}: ${env.frontendUrl}/contact`, '', `(c) ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.`);
  return lines.join('\n');
}

function renderEmail(spec: EmailSpec): EmailContent {
  return { html: renderHtml(spec), text: renderText(spec) };
}

function firstName(fullName: string | null): string | null {
  return fullName ? fullName.trim().split(/\s+/)[0] : null;
}

// ─── Welcome (self-serve signup — the account already has a password) ─────

export function welcomeEmail(fullName: string | null, dashboardUrl: string): EmailContent {
  const name = firstName(fullName);
  return renderEmail({
    preview: `Your ${SITE_NAME} account is ready.`,
    heading: name ? `Welcome, ${name}` : `Welcome to ${SITE_NAME}`,
    paragraphs: [`Thanks for signing up. Your account is ready, and we're glad you're here.`],
    cta: { label: 'Go to your dashboard', url: dashboardUrl },
    reason: `You're receiving this because you created a ${SITE_NAME} account with this email address.`,
    consent: 'By signing up, you agreed to our',
    help: { lead: "If you haven't created this account, contact", link: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  });
}

// ─── Set password (admin-provisioned / corporate onboarding — no password yet) ─

export function setPasswordEmail(fullName: string | null, link: string, orgLabel: string): EmailContent {
  const name = firstName(fullName);
  const hasOrg = orgLabel !== DEFAULT_ORG;
  return renderEmail({
    preview: `Set your password to start using ${SITE_NAME}${hasOrg ? ` with ${orgLabel}` : ''}.`,
    heading: name ? `Hi ${name}` : `Welcome to ${SITE_NAME}`,
    paragraphs: [
      `${hasOrg ? `${orgLabel} added you to ${SITE_NAME}.` : `An account was created for you on ${SITE_NAME}.`} Set a password to sign in.`,
    ],
    cta: { label: 'Set your password', url: link },
    notes: [`This link is valid for ${SET_PASSWORD_LINK_HOURS} hours. If it expires, use "Forgot password?" on the sign-in screen.`],
    reason: hasOrg
      ? `You're receiving this invitation because ${orgLabel} added this email address to ${SITE_NAME}.`
      : `You're receiving this invitation because an administrator added this email address to ${SITE_NAME}.`,
    help: { lead: "If you weren't expecting this invitation, contact", link: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  });
}

// ─── Password reset (forgot-password flow — the account exists) ───────────

export function passwordResetEmail(resetLink: string): EmailContent {
  return renderEmail({
    preview: `Reset your ${SITE_NAME} password. This link expires in 1 hour.`,
    heading: 'Reset your password',
    paragraphs: [`We got a request to reset your ${SITE_NAME} password. The link expires in **1 hour**.`],
    cta: { label: 'Reset password', url: resetLink },
    notes: ["If you didn't ask for this, ignore this email. Your password won't change."],
    reason: `You're receiving this because a password reset was requested for this email address on ${SITE_NAME}.`,
    help: { lead: 'Questions? Contact us at', link: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  });
}

// ─── Cohort welcome (added to a cohort roster) ───────────────────────────

export function cohortWelcomeEmail(fullName: string | null, cohortTitle: string, cohortUrl: string): EmailContent {
  const name = firstName(fullName);
  return renderEmail({
    preview: `You've been added to ${cohortTitle}.`,
    heading: name ? `You're in, ${name}` : "You're in",
    paragraphs: [`You were added to the **${cohortTitle}** cohort on ${SITE_NAME}.`],
    cta: { label: `Open ${cohortTitle}`, url: cohortUrl },
    notes: ['Not expecting this? Reply to let your cohort organiser know.'],
    reason: `You're receiving this because you were added to a cohort on ${SITE_NAME}.`,
    help: { lead: 'Questions? Contact us at', link: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  });
}
