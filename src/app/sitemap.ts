import type { MetadataRoute } from "next";

// Public, crawlable pages. The signed-in app (dashboard, trades, etc.) is
// intentionally excluded - it lives behind auth and shouldn't be indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://cuequill.com";
  const now = new Date();
  const routes = ["", "/features", "/pricing", "/privacy", "/terms", "/login"];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
