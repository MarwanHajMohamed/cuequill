import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";

// Powers the login-time "new trades imported automatically" pop-up.
//
// GET  → { notify, insertedCount, syncedAt } — notify=true when the
//        cron (or an earlier session's manual sync) inserted rows
//        since the user last acknowledged the notice.
// POST → marks the current sync as seen. Idempotent.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const user = await User.findById(session.user.id)
    .select("ibkrLastSync ibkrLastSyncInserted ibkrLastSyncSeenAt")
    .lean<{
      ibkrLastSync?: Date;
      ibkrLastSyncInserted?: number;
      ibkrLastSyncSeenAt?: Date;
    }>();

  const inserted = user?.ibkrLastSyncInserted ?? 0;
  const syncedAt = user?.ibkrLastSync ?? null;
  const seenAt = user?.ibkrLastSyncSeenAt ?? null;

  const notify =
    inserted > 0 &&
    !!syncedAt &&
    (!seenAt || new Date(syncedAt).getTime() > new Date(seenAt).getTime());

  return NextResponse.json({
    notify,
    insertedCount: inserted,
    syncedAt,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  // Stamp the seen marker at the current sync time so any *newer*
  // sync (e.g. tonight's cron) still trips notify=true tomorrow.
  const user = await User.findById(session.user.id).select("ibkrLastSync");
  const seenAt = user?.ibkrLastSync ?? new Date();
  await User.findByIdAndUpdate(session.user.id, {
    ibkrLastSyncSeenAt: seenAt,
  });

  return NextResponse.json({ ok: true });
}
