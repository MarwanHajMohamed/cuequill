import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncBalanceForUser } from "@/lib/balanceSync";

// Manual "sync balance now" from the settings UI. Like the trades sync,
// this is available to any user with credentials configured — nightly
// auto-sync is the Pro-only part (handled by the cron).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncBalanceForUser(session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Balance sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
