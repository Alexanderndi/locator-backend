export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL ?? '',
    path:
      process.env.DATABASE_PATH ??
      (process.env.VERCEL ? '/tmp/fvl.db' : 'fvl.db'),
    synchronize: process.env.DB_SYNCHRONIZE ?? 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'fvl-dev-jwt-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  qr: {
    hmacSecret: process.env.QR_HMAC_SECRET ?? 'fvl-qr-hmac-dev-secret',
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN ?? '',
    crashRateAlertThreshold: 0.005,
  },
});
