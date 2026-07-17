import * as Sentry from "@sentry/nextjs";

// Server/edge error + performance monitoring. Only initialises when a DSN
// is configured, so the app runs untouched until you set SENTRY_DSN.
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === "production",
    });
  }
}

// Reports errors thrown in server components / route handlers to Sentry.
export const onRequestError = Sentry.captureRequestError;
