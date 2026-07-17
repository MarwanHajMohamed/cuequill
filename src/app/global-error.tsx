"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Catches errors thrown while rendering the root layout / a page and reports
// them to Sentry, then shows a minimal fallback.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0f",
          color: "#e5e7eb",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Something went wrong.
          </h2>
          <p style={{ marginTop: "0.5rem", color: "#9ca3af", fontSize: "0.9rem" }}>
            The error has been logged. Please try again.
          </p>
        </div>
      </body>
    </html>
  );
}
