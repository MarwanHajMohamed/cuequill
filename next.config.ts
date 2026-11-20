import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
};

// Bundle analyzer - only active when ANALYZE=true (e.g. `ANALYZE=true npm run
// build`). Writes static HTML reports under .next/analyze/ and never opens a
// browser, so it's safe in CI / headless. A no-op in normal builds.
const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const withAnalyzer = withBundleAnalyzer(nextConfig);

// Only wrap with Sentry when a DSN is configured, so local/dev builds and
// anyone without Sentry set up get the plain config untouched. Source-map
// upload only runs when SENTRY_AUTH_TOKEN (+ org/project) are present.
export default process.env.SENTRY_DSN
  ? withSentryConfig(withAnalyzer, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : withAnalyzer;
