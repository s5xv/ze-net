import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://39e4b72ba86f516e9c6a2f01fa59ffe2@o4511716894638080.ingest.de.sentry.io/4511716909645905",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/ze-net\.vercel\.app\/api/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true
});

// Expose Sentry to window for console testing
if (typeof window !== 'undefined') {
  window.Sentry = Sentry;
}

export default Sentry;
