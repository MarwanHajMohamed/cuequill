import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live quotes for the Markets page, sourced from Yahoo (no API key
// required). Unlike Finnhub's free /quote, Yahoo exposes pre/post-market
// prices explicitly via `marketState` + `preMarketPrice` / `postMarketPrice`,
// so the page can show premarket movement the way MarketWatch does.
//
// A small per-symbol cache keeps Yahoo requests light when the page polls.

type Quote = {
  symbol: string;
  marketState: string; // PRE | REGULAR | POST | PREPRE | POSTPOST | CLOSED
  price: number; // session-appropriate price (pre/post/regular)
  change: number;
  changePct: number;
  regularPrice: number;
  prevClose: number;
  extended: boolean; // true when showing pre- or post-market
  ts: number;
};

const CACHE_TTL_MS = 12_000;
const MAX_SYMBOLS = 20;
const cache = new Map<string, { data: Quote; ts: number }>();

// Yahoo's raw quote shape (only the fields we use).
type YQuote = {
  symbol?: string;
  marketState?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
};

function normalize(q: YQuote): Quote | null {
  if (!q || typeof q.symbol !== "string") return null;
  const state = q.marketState ?? "REGULAR";
  const regular = q.regularMarketPrice ?? 0;
  const prevClose = q.regularMarketPreviousClose ?? regular;

  let price = regular;
  let change = q.regularMarketChange ?? 0;
  let changePct = q.regularMarketChangePercent ?? 0;
  let extended = false;

  // Pre-market: show the premarket print, change vs prior close.
  if (
    (state === "PRE" || state === "PREPRE") &&
    typeof q.preMarketPrice === "number"
  ) {
    price = q.preMarketPrice;
    change = q.preMarketChange ?? price - prevClose;
    changePct =
      q.preMarketChangePercent ??
      (prevClose ? ((price - prevClose) / prevClose) * 100 : 0);
    extended = true;
  }
  // After-hours: show the post-market print, change vs regular close.
  else if (
    (state === "POST" || state === "POSTPOST") &&
    typeof q.postMarketPrice === "number"
  ) {
    price = q.postMarketPrice;
    change = q.postMarketChange ?? price - regular;
    changePct =
      q.postMarketChangePercent ??
      (regular ? ((price - regular) / regular) * 100 : 0);
    extended = true;
  }

  return {
    symbol: q.symbol,
    marketState: state,
    price,
    change,
    changePct,
    regularPrice: regular,
    prevClose,
    extended,
    ts: Date.now(),
  };
}

async function fetchQuotes(symbols: string[]): Promise<void> {
  const now = Date.now();
  const stale = symbols.filter((s) => {
    const c = cache.get(s);
    return !c || now - c.ts >= CACHE_TTL_MS;
  });
  if (stale.length === 0) return;

  const ingest = (raw: unknown) => {
    const q = normalize(raw as YQuote);
    if (q) cache.set(q.symbol, { data: q, ts: Date.now() });
  };

  try {
    // One batched request for all stale symbols.
    const res = await yahooFinance.quote(stale);
    const arr = Array.isArray(res) ? res : [res];
    arr.forEach(ingest);
  } catch {
    // A single bad ticker can fail the batch - retry the rest one by one
    // so good symbols still update.
    await Promise.all(
      stale.map(async (s) => {
        try {
          ingest(await yahooFinance.quote(s));
        } catch {
          /* leave last-good value in cache */
        }
      }),
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("symbols") ?? "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  await fetchQuotes(symbols);

  const quotes = symbols
    .map((s) => cache.get(s)?.data)
    .filter((q): q is Quote => q !== undefined);

  return NextResponse.json({ quotes });
}
