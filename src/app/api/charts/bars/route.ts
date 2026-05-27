import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import {
  etComponents,
  etToFakeUtcSeconds,
  RTH_OPEN_MIN,
  RTH_CLOSE_MIN,
} from "@/app/charts/chartTime";

const yahooFinance = new YahooFinance();
const ALPACA_KEY_ID = process.env.ALPACA_API_KEY_ID;
const ALPACA_SECRET = process.env.ALPACA_API_SECRET_KEY;
const ALPACA_MAX_DAYS = 2000;
const YAHOO_MAX_DAYS = 59;

type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Quote = {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

function bucketKey(et: ReturnType<typeof etComponents>): {
  key: string;
  time: number;
} | null {
  const mod = et.hour * 60 + et.minute;
  if (mod < RTH_OPEN_MIN || mod >= RTH_CLOSE_MIN) return null;
  let bucketHour: number;
  let bucketMinute: number;
  if (mod < RTH_OPEN_MIN + 30) {
    bucketHour = 9;
    bucketMinute = 30;
  } else {
    bucketHour = 10 + Math.floor((mod - 600) / 60);
    bucketMinute = 0;
  }
  return {
    key: `${et.year}-${et.month}-${et.day}-${bucketHour}-${bucketMinute}`,
    time: etToFakeUtcSeconds(et.year, et.month, et.day, bucketHour, bucketMinute),
  };
}

async function fetchYahoo(
  symbol: string,
  period1: Date,
  period2: Date,
  days: number
): Promise<Quote[]> {
  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: days <= 7 ? "1m" : "5m",
  });
  return result.quotes ?? [];
}

type AlpacaBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

async function fetchAlpaca(
  symbol: string,
  period1: Date,
  period2: Date
): Promise<Quote[]> {
  const out: Quote[] = [];
  let pageToken: string | null = null;
  const start = period1.toISOString();
  const end = period2.toISOString();
  for (let safety = 0; safety < 50; safety++) {
    const params = new URLSearchParams({
      symbols: symbol,
      timeframe: "5Min",
      start,
      end,
      limit: "10000",
      adjustment: "raw",
      feed: "iex",
      sort: "asc",
    });
    if (pageToken) params.set("page_token", pageToken);
    const url = `https://data.alpaca.markets/v2/stocks/bars?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_KEY_ID!,
        "APCA-API-SECRET-KEY": ALPACA_SECRET!,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Alpaca ${res.status}: ${text.slice(0, 200)}`);
    }
    const data: {
      bars?: Record<string, AlpacaBar[]>;
      next_page_token?: string | null;
    } = await res.json();
    const bars = data.bars?.[symbol] ?? [];
    for (const b of bars) {
      out.push({
        date: new Date(b.t),
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
        volume: b.v,
      });
    }
    if (!data.next_page_token) break;
    pageToken = data.next_page_token;
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  const useAlpaca = !!(ALPACA_KEY_ID && ALPACA_SECRET);
  const maxDays = useAlpaca ? ALPACA_MAX_DAYS : YAHOO_MAX_DAYS;
  const days = Math.min(
    maxDays,
    Math.max(1, parseInt(searchParams.get("days") || String(maxDays)))
  );

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const period2 = new Date();
  const period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);

  let quotes: Quote[];
  try {
    quotes = useAlpaca
      ? await fetchAlpaca(symbol, period1, period2)
      : await fetchYahoo(symbol, period1, period2, days);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch data: ${msg}` },
      { status: 502 }
    );
  }

  const buckets = new Map<string, Bar>();
  for (const q of quotes) {
    if (
      q.open == null ||
      q.high == null ||
      q.low == null ||
      q.close == null ||
      !q.date
    )
      continue;
    const et = etComponents(q.date);
    const b = bucketKey(et);
    if (!b) continue;
    const existing = buckets.get(b.key);
    if (!existing) {
      buckets.set(b.key, {
        time: b.time,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      });
    } else {
      existing.high = Math.max(existing.high, q.high);
      existing.low = Math.min(existing.low, q.low);
      existing.close = q.close;
      existing.volume += q.volume ?? 0;
    }
  }

  const bars = Array.from(buckets.values()).sort((a, b) => a.time - b.time);
  return NextResponse.json({
    symbol,
    bars,
    source: useAlpaca ? "alpaca" : "yahoo",
  });
}
