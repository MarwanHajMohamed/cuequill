import { NextResponse } from "next/server";

const ALPACA_KEY_ID = process.env.ALPACA_API_KEY_ID;
const ALPACA_SECRET = process.env.ALPACA_API_SECRET_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

const WORLD_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type NewsImage = { size: "thumb" | "small" | "large"; url: string };

export type NewsArticle = {
  id: string;
  headline: string;
  summary: string;
  author: string;
  created_at: string;
  updated_at: string;
  url: string;
  source: string;
  symbols: string[];
  images: NewsImage[];
};

// Module-level cache for world news (per warm Lambda instance)
type WorldCacheEntry = { fetchedAt: number; articles: NewsArticle[] };
const worldCache = new Map<string, WorldCacheEntry>();

type AlpacaNewsItem = {
  id: number;
  headline: string;
  summary: string;
  author: string;
  created_at: string;
  updated_at: string;
  url: string;
  source: string;
  symbols: string[];
  images: NewsImage[];
};

async function fetchMarkets(
  symbols: string,
  since: string | null,
  limit: string
): Promise<NewsArticle[]> {
  if (!ALPACA_KEY_ID || !ALPACA_SECRET) {
    throw new Error("Alpaca API keys not configured");
  }
  const params = new URLSearchParams({
    sort: "desc",
    limit,
    include_content: "false",
    exclude_contentless: "true",
  });
  if (symbols) params.set("symbols", symbols.toUpperCase());
  if (since) params.set("start", since);

  const url = `https://data.alpaca.markets/v1beta1/news?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": ALPACA_KEY_ID,
      "APCA-API-SECRET-KEY": ALPACA_SECRET,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alpaca ${res.status}: ${text.slice(0, 200)}`);
  }
  const data: { news?: AlpacaNewsItem[] } = await res.json();
  return (data.news ?? []).map((a) => ({
    id: `alpaca-${a.id}`,
    headline: a.headline,
    summary: a.summary,
    author: a.author,
    created_at: a.created_at,
    updated_at: a.updated_at,
    url: a.url,
    source: a.source,
    symbols: a.symbols,
    images: a.images,
  }));
}

type GNewsItem = {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
};

async function fetchWorld(query: string): Promise<NewsArticle[]> {
  if (!GNEWS_API_KEY) {
    throw new Error("GNews API key not configured");
  }
  const cacheKey = query || "__top__";
  const now = Date.now();
  const cached = worldCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < WORLD_CACHE_TTL_MS) {
    return cached.articles;
  }

  const params = new URLSearchParams({
    lang: "en",
    max: "10", // free-tier cap
    apikey: GNEWS_API_KEY,
  });
  let url: string;
  if (query) {
    params.set("q", query);
    params.set("sortby", "publishedAt");
    url = `https://gnews.io/api/v4/search?${params.toString()}`;
  } else {
    params.set("category", "general");
    url = `https://gnews.io/api/v4/top-headlines?${params.toString()}`;
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    // If rate-limited, fall back to stale cache rather than failing.
    if (cached) return cached.articles;
    throw new Error(`GNews ${res.status}: ${text.slice(0, 200)}`);
  }
  const data: { articles?: GNewsItem[] } = await res.json();
  const articles: NewsArticle[] = (data.articles ?? []).map((a) => ({
    id: `gnews-${a.url}`,
    headline: a.title,
    summary: a.description ?? "",
    author: "",
    created_at: a.publishedAt,
    updated_at: a.publishedAt,
    url: a.url,
    source: a.source?.name ?? "GNews",
    symbols: [],
    images: a.image
      ? [
          { size: "large", url: a.image },
          { size: "thumb", url: a.image },
        ]
      : [],
  }));
  worldCache.set(cacheKey, { fetchedAt: now, articles });
  return articles;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source") === "world" ? "world" : "markets";
  const symbols = searchParams.get("symbols") || "";
  const query = searchParams.get("q") || "";
  const since = searchParams.get("since");
  const limit = searchParams.get("limit") || "50";

  try {
    const articles =
      source === "world"
        ? await fetchWorld(query.trim())
        : await fetchMarkets(symbols, since, limit);
    return NextResponse.json({ news: articles, source });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
