import * as Sentry from '@sentry/nuxt'

const dsn = useRuntimeConfig().public.sentryDsn

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: import.meta.dev ? 1.0 : 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
    enableLogs: true,
  })
}
