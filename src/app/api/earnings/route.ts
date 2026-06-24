import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// yahoo-finance2 v3 ships a class that must be instantiated. One shared
// instance reuses the cookie/crumb cache across requests.
const yahooFinance = new YahooFinance();

// Yahoo's per-symbol calendar events give a reliable next-earnings date
// and consensus EPS. (Yahoo has no clean market-wide earnings-by-day
// endpoint, so this is scoped to the caller's symbols.)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");

function toDay(d: unknown): string | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d as string);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export type EarningsEntry = {
  symbol: string;
  name: string | null;
  date: string | null; // "yyyy-MM-dd"
  isEstimate: boolean; // Yahoo flags unconfirmed dates as estimates
  epsEstimate: number | null;
};

type QuoteSummaryShape = {
  calendarEvents?: {
    earnings?: {
      earningsDate?: Date[] | Date;
      isEarningsDateEstimate?: boolean;
      earningsAverage?: number;
    };
  };
  price?: { shortName?: string; longName?: string };
};

async function fetchOne(symbol: string): Promise<EarningsEntry> {
  try {
    // validateResult:false avoids Yahoo schema-validation throws; it also
    // widens the return type, so we assert the slice we read.
    const r = (await yahooFinance.quoteSummary(
      symbol,
      { modules: ["calendarEvents", "price"] },
      { validateResult: false },
    )) as QuoteSummaryShape;
    const earnings = r?.calendarEvents?.earnings;
    const dates = earnings?.earningsDate;
    const first = Array.isArray(dates) ? dates[0] : dates;
    const price = r?.price;
    return {
      symbol,
      name: price?.shortName ?? price?.longName ?? null,
      date: toDay(first),
      isEstimate: Boolean(earnings?.isEarningsDateEstimate),
      epsEstimate:
        typeof earnings?.earningsAverage === "number"
          ? earnings.earningsAverage
          : null,
    };
  } catch {
    return { symbol, name: null, date: null, isEstimate: false, epsEstimate: null };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("symbols") ?? "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.\-]{1,10}$/.test(s)),
    ),
  ).slice(0, 60);

  if (symbols.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const settled = await Promise.allSettled(symbols.map(fetchOne));
  const entries = settled
    .filter(
      (s): s is PromiseFulfilledResult<EarningsEntry> =>
        s.status === "fulfilled",
    )
    .map((s) => s.value);

  return NextResponse.json({ entries });
}
