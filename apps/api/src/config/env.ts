export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  APP_PORT: Number(process.env.APP_PORT ?? 4000),
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-secret-change-me-32-chars-min',
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef',
  ACCESS_TOKEN_TTL_SECONDS: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES ?? 5368709120),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/connected-accounts/google/callback',
}
