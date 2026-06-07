import type { MetadataRoute } from "next";

// PWA manifest. Next.js auto-serves this as `/manifest.webmanifest` and
// wires it into the document head via the `manifest` field on the
// `metadata` export in `layout.tsx`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cuequill",
    short_name: "Cuequill",
    description:
      "Discretionary US-options trading journal — strategies, calendar, and stats.",
    // Open straight to the dashboard when launched from the home screen.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0E0E10",
    theme_color: "#0E0E10",
    icons: [
      // `app/icon.tsx` is auto-routed to `/icon`. Listing it twice with
      // different `purpose` values lets the same asset serve as both
      // the regular icon and the Android maskable icon.
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
