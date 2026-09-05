import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL', 'postgresql://sypher:sypher@localhost:5433/sypher_next?schema=public'),
  cookieDomain: process.env.COOKIE_DOMAIN ?? '.sypher.local',
  corsOrigins: (
    process.env.CORS_ORIGINS ??
    'http://localhost:3002,http://next.sypher.local:3002,https://next.sypher.local,https://corporate.sypher.local'
  ).split(','),
  logEnabled: process.env.LOG_ENABLED !== 'false',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'sypher_next_session',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  frontendUrl: process.env.FRONTEND_URL ?? 'https://next.sypher.local',
  apiBaseUrl: process.env.API_BASE_URL ?? 'https://api-next.sypher.local',
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY ?? '',
    required: process.env.RECAPTCHA_REQUIRED === 'true' || (process.env.RECAPTCHA_REQUIRED !== 'false' && (process.env.NODE_ENV ?? 'development') === 'production'),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? `${process.env.API_BASE_URL ?? 'https://api-next.sypher.local'}/auth/google/callback`,
  },
  email: {
    // When 'smtp', the rotation uses ONLY the SMTP provider (below) and
    // never contacts Brevo/Resend — that's how a GreenMail/Mailpit server
    // (local container OR a shared external one) intercepts every
    // transactional email. Unset (the default, and production) → Brevo →
    // Resend as before.
    transport: process.env.EMAIL_TRANSPORT ?? '',
    smtp: {
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 3025),
      // true = TLS on connect (e.g. :465). Leave false for plain GreenMail
      // on :3025 — nodemailer still STARTTLS-upgrades if the server offers it.
      secure: process.env.SMTP_SECURE === 'true',
      // Optional — omit both for a local GreenMail started with
      // -Dgreenmail.auth.disabled; set them for an external server.
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
      from: process.env.SMTP_FROM ?? 'Sypher <no-reply@sypher.local>',
    },
    brevo: {
      apiKey: process.env.BREVO_API_KEY ?? '',
      senderEmail: process.env.BREVO_SENDER_EMAIL ?? '',
      dailyLimit: process.env.BREVO_DAILY_LIMIT ?? '',
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY ?? '',
      senderEmail: process.env.RESEND_SENDER_EMAIL ?? '',
      dailyLimit: process.env.RESEND_DAILY_LIMIT ?? '',
      monthlyLimit: process.env.RESEND_MONTHLY_LIMIT ?? '',
    },
  },
  // Same Bunny zone as apps/web (apps/web/.env's BUNNY_* — server-only)
  // — plain server-side names here since apps/api never ships to a browser
  // bundle. Only used by scripts/import-docusaurus-course.ts today.
  bunny: {
    storageZone: process.env.BUNNY_STORAGE_ZONE ?? '',
    storageAccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY ?? '',
    storageHostname: process.env.BUNNY_STORAGE_HOSTNAME ?? '',
    pullZoneUrl: process.env.BUNNY_PULL_ZONE_URL ?? '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    upgradePriceInrPaise: Number(process.env.PAID_UPGRADE_PRICE_INR_PAISE ?? 0),
    upgradeGstRate: Number(process.env.PAID_UPGRADE_GST_RATE ?? 0.18),
    upgradeDurationDays: Number(process.env.PAID_UPGRADE_DURATION_DAYS ?? 365),
  },
};
