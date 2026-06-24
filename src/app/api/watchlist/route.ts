import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

// Sensible starting watchlist for first-time visitors (single-name stocks
// that actually report earnings — no ETFs). Returned but not persisted
// until the user saves an edit.
const DEFAULT_WATCHLIST = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "META",
  "TSLA",
  "GOOGL",
  "NFLX",
];

const MAX_SYMBOLS = 60;

// Normalize an incoming list: uppercase, trim, valid ticker shape, unique,
// capped. Allows letters, digits, dot and dash (e.g. BRK.B).
function clean(symbols: unknown): string[] {
  if (!Array.isArray(symbols)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of symbols) {
    if (typeof raw !== "string") continue;
    const s = raw.trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,10}$/.test(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_SYMBOLS) break;
  }
  return out;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const user = await User.findById(session.user.id).select("watchlist").lean<{
    watchlist?: string[];
  }>();
  const symbols =
    user?.watchlist && user.watchlist.length > 0
      ? user.watchlist
      : DEFAULT_WATCHLIST;
  return NextResponse.json({ symbols });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const symbols = clean((body as { symbols?: unknown })?.symbols);
  await connectDb();
  await User.findByIdAndUpdate(session.user.id, { watchlist: symbols });
  return NextResponse.json({ symbols });
}
