import * as Sentry from "@sentry/nuxt";
 
Sentry.init({
  dsn: "https://44e64125473f5bc8a28d348f316374a7@o4509933237043200.ingest.de.sentry.io/4509933243990096",

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
