import type { MetadataRoute } from "next";

// Let search engines crawl the public marketing pages, but keep the
// signed-in app, API routes, and auth flows out of the index. Every
// authed section is listed explicitly so a leaked deep link from a
// share card or error page can't get crawled.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/affirmations",
        "/balance",
        "/calendar",
        "/challenges",
        "/chat",
        "/checkout",
        "/community",
        "/dashboard",
        "/data",
        "/earnings",
        "/forgot-password",
        "/friends",
        "/goals",
        "/leaderboard",
        "/reports",
        "/reset-password",
        "/rules",
        "/settings",
        "/stocks",
        "/strategies",
        "/strategies_used",
        "/trades",
        "/trophies",
      ],
    },
    sitemap: "https://cuequill.com/sitemap.xml",
    host: "https://cuequill.com",
  };
}
