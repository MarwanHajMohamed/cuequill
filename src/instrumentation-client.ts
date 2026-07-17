import * as Sentry from "@sentry/nextjs";

// Browser error monitoring. Gated on a public DSN so nothing runs (or ships
// in the client bundle's runtime path) until you configure it.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production",
  });
}

// Lets Sentry tie client-side navigations to traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
