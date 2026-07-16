import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getQuotes } from "@/lib/marketData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/quote?symbols=SPY,AAPL,NVDA
// Live(ish) quotes for the given US symbols. Auth-gated (any signed-in
// user) — used by the dashboard to mark open positions to market.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("symbols") ?? "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50); // cap the fan-out
  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} });
  }

  try {
    const map = await getQuotes(symbols);
    return NextResponse.json({ quotes: Object.fromEntries(map) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quote lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
