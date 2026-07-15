import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { PriceCache } from "@/lib/models/PriceCache";
import type { Bar } from "@/lib/backtest/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Historical daily OHLC bars for a symbol, used by the backtester.
// Source: Stooq (free, no API key). Bars are cached per symbol and only
// refreshed once the cache is older than TTL, so reruns are instant and we
// stay well within the provider's limits.
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

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

// Stooq daily CSV: "Date,Open,High,Low,Close,Volume" then rows.
function parseStooqCsv(csv: string): Bar[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || !/^date,/i.test(lines[0])) return [];
  const out: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, open, high, low, close, volume] = lines[i].split(",");
    const o = parseFloat(open);
    const h = parseFloat(high);
    const l = parseFloat(low);
    const c = parseFloat(close);
    if (!date || !Number.isFinite(o) || !Number.isFinite(c)) continue;
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

async function fetchFromStooq(symbol: string): Promise<Bar[]> {
  const s = encodeURIComponent(symbol.toLowerCase());
  const url = `https://stooq.com/q/d/l/?s=${s}.us&i=d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (cuequill backtester)" },
  });
  if (!res.ok) throw new Error(`provider ${res.status}`);
  const csv = await res.text();
  return parseStooqCsv(csv);
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

  let bars: Bar[];
  try {
    bars = await fetchFromStooq(symbol);
  } catch {
    // Fall back to a stale cache if the provider is unreachable.
    if (cached && cached.bars.length > 0) {
      return NextResponse.json({ symbol, bars: cached.bars, cached: true });
    }
    return NextResponse.json(
      { error: "Couldn't reach the data provider. Try again shortly." },
      { status: 502 },
    );
  }

  if (bars.length === 0) {
    return NextResponse.json(
      { error: `No data for "${symbol}". Check the ticker (US stocks/ETFs).` },
      { status: 404 },
    );
  }

  await PriceCache.findOneAndUpdate(
    { symbol },
    { symbol, bars, fetchedAt: new Date() },
    { upsert: true },
  );

  return NextResponse.json({ symbol, bars, cached: false });
}
