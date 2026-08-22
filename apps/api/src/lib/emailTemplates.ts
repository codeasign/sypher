// Plain inline-styled HTML — no build step for email, and most clients strip
// <style> blocks anyway. Kept deliberately simple (no shared layout system)
// since there are only two templates.
const BRAND_COLOR = '#1e4d8c';

function wrapper(bodyHtml: string): string {
  return `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
    <p style="font-size: 20px; font-weight: 700; color: ${BRAND_COLOR}; margin: 0 0 24px;">Sypher</p>
    ${bodyHtml}
    <p style="font-size: 12px; color: #888; margin-top: 32px;">Sypher — Learn by building.</p>
  </div>`;
}

export function passwordResetEmailHtml(resetLink: string): string {
  return wrapper(`
    <p style="font-size: 16px; margin: 0 0 16px;">Reset your password</p>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      We received a request to reset your Sypher password. This link expires in 1 hour.
    </p>
    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
      Reset password
    </a>
    <p style="font-size: 13px; color: #666; margin: 24px 0 0;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `);
}

export function welcomeEmailHtml(fullName: string | null): string {
  const greeting = fullName ? `Welcome, ${fullName}!` : 'Welcome!';
  return wrapper(`
    <p style="font-size: 16px; margin: 0 0 16px;">${greeting}</p>
    <p style="font-size: 14px; line-height: 1.6; margin: 0;">
      Your Sypher account is ready. Head back to your dashboard to start learning.
    </p>
  `);
}
