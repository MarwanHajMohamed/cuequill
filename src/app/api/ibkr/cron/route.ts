import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { syncForUser } from "@/lib/ibkrSync";
import { isMarketOpenAt } from "@/lib/marketHolidays";

// IBKR's Flex Web Service generates a statement on-demand, then we poll
// (up to ~50s) until it's ready. The default Vercel function timeout is
// 10s on Hobby and 60s on Pro, so we explicitly raise it. 300s is the
// Pro/Enterprise hard limit - set high to be safe.
export const maxDuration = 300;
// Force Node runtime (default for App Router, but explicit for cron).
export const runtime = "nodejs";
// Don't cache the cron response - every invocation must run fresh.
export const dynamic = "force-dynamic";

// Returns ok + a human reason so a 401 tells you WHICH check failed
// (missing env vs missing header vs mismatch) instead of a blanket
// "Unauthorized". Never returns or logs the secret itself.
function checkAuth(req: Request): { ok: boolean; reason: string } {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  // Vercel-signed cron header, kept as a fallback.
  if (req.headers.get("x-vercel-cron")) return { ok: true, reason: "vercel" };
  if (!secret) {
    return { ok: false, reason: "CRON_SECRET is not set on the server" };
  }
  if (!auth) {
    return { ok: false, reason: "no Authorization header was received" };
  }
  if (auth !== `Bearer ${secret}`) {
    return {
      ok: false,
      reason: "Authorization header did not match CRON_SECRET",
    };
  }
  return { ok: true, reason: "bearer" };
}

async function runSync() {
  await connectDb();
  // Auto-sync is Pro-only. Free users with IBKR creds saved still get
  // the manual import button in settings — they're just not in the
  // nightly job.
  const users = await User.find({
    ibkrToken: { $exists: true, $ne: "" },
    ibkrQueryId: { $exists: true, $ne: "" },
    isPro: true,
  }).select("_id");

  const results: Array<{
    userId: string;
    status: string;
    inserted?: number;
    error?: string;
  }> = [];

  for (const user of users) {
    try {
      const result = await syncForUser(user._id.toString());
      results.push({
        userId: user._id.toString(),
        status: "ok",
        inserted: result.inserted,
      });
    } catch (err) {
      results.push({
        userId: user._id.toString(),
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { synced: results.length, results };
}

export async function GET(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) {
    // Log shapes only (never the secret) so you can spot a length/prefix
    // mismatch — e.g. a trailing newline pasted into Vercel or QStash.
    const header = req.headers.get("authorization");
    console.warn("[cron/ibkr] 401:", auth.reason, {
      hasSecret: !!process.env.CRON_SECRET,
      secretLen: process.env.CRON_SECRET?.length ?? 0,
      hasAuthHeader: !!header,
      authHeaderLen: header?.length ?? 0,
      startsWithBearer: header?.startsWith("Bearer ") ?? false,
    });
    return NextResponse.json(
      { error: "Unauthorized", reason: auth.reason },
      { status: 401 },
    );
  }

  // Opt-in market-hours guard for the intraday schedule (?intraday=1).
  // When set, skip cheaply outside RTH so the every-15-min poll doesn't
  // hammer IBKR's Flex service (and hit its rate limits) overnight or on
  // holidays. The nightly run omits the param and always executes.
  const intraday = new URL(req.url).searchParams.get("intraday") === "1";
  if (intraday) {
    const nyNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
    );
    if (!isMarketOpenAt(nyNow)) {
      return NextResponse.json({ skipped: true, reason: "market closed" });
    }
  }

  const result = await runSync();
  // Console logs show up in Vercel's function logs so you can debug what
  // the cron did at runtime.
  console.log("[cron/ibkr]", JSON.stringify(result));
  return NextResponse.json(result);
}

// Vercel cron uses GET by default, but Vercel's docs also support POST
// for protected routes. Mirror the GET handler so either method works.
export async function POST(req: Request) {
  return GET(req);
}
