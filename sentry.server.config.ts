import * as Sentry from '@sentry/nuxt'

const dsn = process.env.NUXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    enableLogs: true,
  })
}
