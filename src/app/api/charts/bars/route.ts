import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import {
  etComponents,
  etToFakeUtcSeconds,
  RTH_OPEN_MIN,
  RTH_CLOSE_MIN,
} from "@/app/charts/chartTime";

const yahooFinance = new YahooFinance();

type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  const days = Math.min(59, Math.max(1, parseInt(searchParams.get("days") || "59")));

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const period2 = new Date();
  const period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);

  let quotes: Array<{
    date: Date;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }>;

  try {
    const result = await yahooFinance.chart(symbol, {
      period1,
      period2,
      interval: days <= 7 ? "1m" : "5m",
    });
    quotes = result.quotes ?? [];
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
  return NextResponse.json({ symbol, bars });
}
