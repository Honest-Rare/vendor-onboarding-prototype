// All settings come from the environment (.env locally, compose in the dev container).

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== '' && value !== undefined ? parsed : fallback;
}

export const config = {
  port: num(process.env.API_PORT, 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgres://onboarding:onboarding@localhost:55432/onboarding',
  webBaseUrl: (process.env.WEB_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: num(process.env.SMTP_PORT, 1025),
  mailFrom: process.env.MAIL_FROM ?? 'Honest & Rare <onboarding@honest-rare.test>',
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL ?? 'admin@honest-rare.test',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@honest-rare.test',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'change-me-admin',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  aiProvider: process.env.AI_PROVIDER ?? 'simulated',
  viesEnabled: process.env.VIES_ENABLED !== 'false',
  uploadDir: process.env.UPLOAD_DIR ?? './data/uploads',

  // Placeholder values until the open questions in the PRD are decided.
  tokenTtlHours: {
    confirm_email: 72,
    answer_question: 24 * 14,
    set_password: 72,
  },
  sessionTtlHours: 12,
} as const;
