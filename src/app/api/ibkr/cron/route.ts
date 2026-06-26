import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { syncForUser } from "@/lib/ibkrSync";

// IBKR's Flex Web Service generates a statement on-demand, then we poll
// (up to ~50s) until it's ready. The default Vercel function timeout is
// 10s on Hobby and 60s on Pro, so we explicitly raise it. 300s is the
// Pro/Enterprise hard limit - set high to be safe.
export const maxDuration = 300;
// Force Node runtime (default for App Router, but explicit for cron).
export const runtime = "nodejs";
// Don't cache the cron response - every invocation must run fresh.
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  // Vercel cron requests are signed two ways:
  //   1. Authorization: Bearer ${CRON_SECRET}   - when CRON_SECRET env is set
  //   2. x-vercel-cron header                   - set automatically on cron
  //      invocations and stripped from external traffic
  // Accept either so the job runs whether or not CRON_SECRET is configured.
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth === `Bearer ${process.env.CRON_SECRET}`
  ) {
    return true;
  }
  if (req.headers.get("x-vercel-cron")) return true;
  return false;
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
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
