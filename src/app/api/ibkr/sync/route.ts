import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { previewSyncForUser } from "@/lib/ibkrSync";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manual resyncs are limited to one per 30 minutes per user. Enforced
// server-side (not just the settings UI) so it holds regardless of client.
const MANUAL_COOLDOWN_MS = 30 * 60 * 1000;

// Manual sync triggered from the settings UI. This PREVIEWS only: it
// fetches from IBKR, matches + dedupes, and returns the trades it WOULD
// import (stashed server-side) without writing anything. The client then
// confirms via /api/ibkr/sync/commit. Because it hits IBKR, the 30-min
// manual cooldown applies here (the commit step does not touch IBKR).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select("ibkrLastManualSync");
  const last = user?.ibkrLastManualSync
    ? new Date(user.ibkrLastManualSync).getTime()
    : 0;
  const elapsed = Date.now() - last;
  if (last && elapsed < MANUAL_COOLDOWN_MS) {
    const retryAfterMs = MANUAL_COOLDOWN_MS - elapsed;
    return NextResponse.json(
      {
        error: `You can resync again in ${Math.ceil(retryAfterMs / 60000)} min. Manual syncs are limited to one every 30 minutes.`,
        retryAfterMs,
      },
      { status: 429 },
    );
  }

  try {
    // Record the attempt up front so a long-running (or failing) sync still
    // starts the cooldown and can't be hammered.
    await User.findByIdAndUpdate(session.user.id, {
      ibkrLastManualSync: new Date(),
    });
    const result = await previewSyncForUser(session.user.id);
    return NextResponse.json({ success: true, preview: true, ...result });
  } catch (err) {
    // A failed sync is often a transient IBKR "try again shortly" - don't
    // lock the button for the full 30 min. Roll the cooldown back so only a
    // short retry window remains (still spaced out enough not to hammer IBKR).
    const retryWindowMs = 2 * 60 * 1000;
    await User.findByIdAndUpdate(session.user.id, {
      ibkrLastManualSync: new Date(
        Date.now() - (MANUAL_COOLDOWN_MS - retryWindowMs),
      ),
    }).catch(() => {});
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
