import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { PriceCache } from "@/lib/models/PriceCache";
import type { Bar } from "@/lib/backtest/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Historical daily OHLC bars for a symbol, used by the backtester. Primary
// source is Yahoo Finance's chart API (JSON, no key, reliable server-side
// and split/dividend-adjusted); Stooq is a CSV fallback. Bars are cached
// per symbol and only refreshed once the cache is older than TTL, so reruns
// are instant and we stay within provider limits.
const TTL_MS = 12 * 60 * 60 * 1000; // 12h
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

async function requirePro() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, status: 401 };
  await connectDb();
  const u = await User.findById(session.user.id)
    .select("isPro")
    .lean<{ isPro?: boolean }>();
  if (!u?.isPro) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

// Yahoo v8 chart → split/dividend-adjusted daily OHLC.
async function fetchFromYahoo(symbol: string): Promise<Bar[]> {
  const now = Math.floor(Date.now() / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=0&period2=${now}&interval=1d&events=div%2Csplit`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  const ts: number[] | undefined = r?.timestamp;
  const q = r?.indicators?.quote?.[0];
  if (!ts || !q) return [];
  const adj: (number | null)[] | undefined =
    r?.indicators?.adjclose?.[0]?.adjclose;

  const out: Bar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (c == null || !Number.isFinite(c)) continue;
    let open = q.open?.[i] ?? c;
    let high = q.high?.[i] ?? c;
    let low = q.low?.[i] ?? c;
    let close = c;
    // Scale OHLC by the adjusted-close ratio so splits/dividends don't
    // create fake gaps in a long backtest.
    const a = adj?.[i];
    if (a != null && Number.isFinite(a) && c > 0) {
      const f = a / c;
      open *= f;
      high *= f;
      low *= f;
      close = a;
    }
    out.push({
      date: new Date(ts[i] * 1000).toISOString().split("T")[0],
      open,
      high,
      low,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return out;
}

// Stooq daily CSV fallback: "Date,Open,High,Low,Close,Volume".
async function fetchFromStooq(symbol: string): Promise<Bar[]> {
  const s = encodeURIComponent(symbol.toLowerCase());
  const res = await fetch(`https://stooq.com/q/d/l/?s=${s}.us&i=d`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Stooq returned ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || !/^date,/i.test(lines[0])) return [];
  const out: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, open, high, low, close, volume] = lines[i].split(",");
    const o = parseFloat(open);
    const c = parseFloat(close);
    if (!date || !Number.isFinite(o) || !Number.isFinite(c)) continue;
    const h = parseFloat(high);
    const l = parseFloat(low);
    out.push({
      date,
      open: o,
      high: Number.isFinite(h) ? h : c,
      low: Number.isFinite(l) ? l : c,
      close: c,
      volume: parseFloat(volume) || 0,
    });
  }
  return out;
}

async function fetchBars(
  symbol: string,
): Promise<{ bars: Bar[]; source: string; note?: string }> {
  const errors: string[] = [];
  try {
    const bars = await fetchFromYahoo(symbol);
    if (bars.length > 0) return { bars, source: "yahoo" };
    errors.push("Yahoo: no rows");
  } catch (e) {
    errors.push(`Yahoo: ${(e as Error).message}`);
  }
  try {
    const bars = await fetchFromStooq(symbol);
    if (bars.length > 0) return { bars, source: "stooq" };
    errors.push("Stooq: no rows");
  } catch (e) {
    errors.push(`Stooq: ${(e as Error).message}`);
  }
  return { bars: [], source: "none", note: errors.join("; ") };
}

export async function GET(req: NextRequest) {
  const gate = await requirePro();
  if (!gate.ok) {
    return NextResponse.json(
      {
        error: gate.status === 403 ? "Pro membership required" : "Unauthorized",
      },
      { status: gate.status },
    );
  }

  const raw = new URL(req.url).searchParams.get("symbol") ?? "";
  const symbol = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.\-]/g, "");
  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  await connectDb();
  const cached = await PriceCache.findOne({ symbol });
  const fresh =
    cached && Date.now() - new Date(cached.fetchedAt).getTime() < TTL_MS;
  if (fresh && cached.bars.length > 0) {
    return NextResponse.json({ symbol, bars: cached.bars, cached: true });
  }

  const { bars, source, note } = await fetchBars(symbol);

  if (bars.length === 0) {
    // Fall back to a stale cache if we have one.
    if (cached && cached.bars.length > 0) {
      return NextResponse.json({ symbol, bars: cached.bars, cached: true });
    }
    console.warn(`[backtest/prices] no data for ${symbol}:`, note);
    return NextResponse.json(
      {
        error: `No data for "${symbol}". Check the ticker (US stocks/ETFs) — data providers were unreachable or returned nothing.`,
      },
      { status: 404 },
    );
  }

  await PriceCache.findOneAndUpdate(
    { symbol },
    { symbol, bars, fetchedAt: new Date() },
    { upsert: true },
  );

  return NextResponse.json({ symbol, bars, cached: false, source });
}
