import YahooFinance from "yahoo-finance2";

// Live(ish) market quotes for US stocks/ETFs, sourced from Yahoo Finance
// via yahoo-finance2 — the same dependency the earnings feature already
// uses, so there's no extra API key or provider to configure. Quotes are
// delayed by whatever Yahoo serves (typically ~15 min for free data), not
// true tick data; good enough for marking open positions and answering
// "where's SPY now?".

// One shared instance reuses Yahoo's cookie/crumb cache across requests.
const yahooFinance = new YahooFinance();

export type Quote = {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  marketState: string | null;
  name: string | null;
  time: string | null; // ISO of the quote's regularMarketTime
};

// Short in-memory cache so a burst of lookups (e.g. one per open position
// on a dashboard render) collapses to a single upstream call per symbol.
// Process-local; fine for our scale and self-healing on redeploy.
const TTL_MS = 15 * 1000;
const cache = new Map<string, { at: number; quote: Quote }>();

function normalizeSymbol(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.\-]/g, "");
}

type RawQuote = {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketState?: string;
  shortName?: string;
  longName?: string;
  regularMarketTime?: Date | string | number;
};

function toQuote(q: RawQuote): Quote | null {
  const price = q.regularMarketPrice;
  if (price == null || !Number.isFinite(price)) return null;
  let time: string | null = null;
  if (q.regularMarketTime != null) {
    const d =
      q.regularMarketTime instanceof Date
        ? q.regularMarketTime
        : new Date(q.regularMarketTime);
    time = Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return {
    symbol: q.symbol.toUpperCase(),
    price,
    change: Number.isFinite(q.regularMarketChange)
      ? (q.regularMarketChange as number)
      : null,
    changePct: Number.isFinite(q.regularMarketChangePercent)
      ? (q.regularMarketChangePercent as number)
      : null,
    currency: q.currency ?? null,
    marketState: q.marketState ?? null,
    name: q.shortName ?? q.longName ?? null,
    time,
  };
}

// Fetch quotes for a set of symbols. Returns a map keyed by uppercase
// symbol; symbols Yahoo can't price are simply absent. Never throws for a
// single bad symbol — a total upstream failure rejects so callers can
// surface it.
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const wanted = Array.from(
    new Set(symbols.map(normalizeSymbol).filter(Boolean)),
  );
  const out = new Map<string, Quote>();
  const now = Date.now();

  const misses: string[] = [];
  for (const s of wanted) {
    const hit = cache.get(s);
    if (hit && now - hit.at < TTL_MS) out.set(s, hit.quote);
    else misses.push(s);
  }
  if (misses.length === 0) return out;

  const results = await yahooFinance.quote(misses);
  const arr: RawQuote[] = Array.isArray(results)
    ? (results as RawQuote[])
    : results
      ? [results as RawQuote]
      : [];
  for (const raw of arr) {
    const q = toQuote(raw);
    if (!q) continue;
    cache.set(q.symbol, { at: now, quote: q });
    out.set(q.symbol, q);
  }
  return out;
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const map = await getQuotes([symbol]);
  return map.get(normalizeSymbol(symbol)) ?? null;
}
