import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN || '';
if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration()
    ],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/ze-net\.vercel\.app\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export default Sentry;
