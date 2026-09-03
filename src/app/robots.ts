import type { MetadataRoute } from "next";

// Let search engines crawl the public marketing pages, but keep the
// signed-in app and API routes out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/settings", "/trades", "/data"],
    },
    sitemap: "https://cuequill.com/sitemap.xml",
    host: "https://cuequill.com",
  };
}
