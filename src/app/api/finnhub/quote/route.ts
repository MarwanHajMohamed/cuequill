import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxies Finnhub's /quote so the API key stays server-side. A small
// in-memory, per-symbol cache lets the client poll frequently without
// blowing Finnhub's free-tier limit (60 req/min): each symbol hits
// Finnhub at most once per TTL regardless of how often the page polls.
//
// Requires FINNHUB_API_KEY in the environment (free key from
// https://finnhub.io/register).

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  prevClose: number;
  high: number;
  low: number;
  open: number;
  ts: number;
};

const CACHE_TTL_MS = 15_000;
const MAX_SYMBOLS = 20;
const cache = new Map<string, { data: Quote; ts: number }>();

async function fetchQuote(
  symbol: string,
  token: string,
): Promise<Quote | null> {
  const now = Date.now();
  const cached = cache.get(symbol);
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.data;

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
      symbol,
    )}&token=${token}`;
    const res = await fetch(url, { cache: "no-store" });
    // On rate-limit (429) or any error, fall back to the last good value.
    if (!res.ok) return cached?.data ?? null;
    const j = await res.json();
    // Finnhub returns { c, d, dp, h, l, o, pc, t }. c === 0 means the
    // symbol is unknown / has no data.
    if (typeof j?.c !== "number" || j.c === 0) return cached?.data ?? null;
    const data: Quote = {
      symbol,
      price: j.c,
      change: typeof j.d === "number" ? j.d : 0,
      changePct: typeof j.dp === "number" ? j.dp : 0,
      prevClose: typeof j.pc === "number" ? j.pc : 0,
      high: typeof j.h === "number" ? j.h : 0,
      low: typeof j.l === "number" ? j.l : 0,
      open: typeof j.o === "number" ? j.o : 0,
      ts: typeof j.t === "number" ? j.t : Math.floor(now / 1000),
    };
    cache.set(symbol, { data, ts: now });
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

export async function GET(req: NextRequest) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY not set" },
      { status: 500 },
    );
  }

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

  const results = await Promise.all(
    symbols.map((s) => fetchQuote(s, token).catch(() => null)),
  );
  const quotes = results.filter((q): q is Quote => q !== null);

  return NextResponse.json({ quotes });
}
