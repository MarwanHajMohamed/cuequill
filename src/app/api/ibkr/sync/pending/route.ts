import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getPendingImport } from "@/lib/ibkrSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The trades staged by the last preview (POST /api/ibkr/sync) are kept on
// the user until they're imported (committed) or a newer sync replaces
// them. This lets the settings UI resurface them so the user can change
// their mind and import later.
//
//   GET    -> the stashed trades (empty when nothing is pending)
//   DELETE -> discard the stash
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trades = await getPendingImport(session.user.id);
  return NextResponse.json({
    trades,
    skipped: trades.filter((t) => t._skipped).length,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  await User.findByIdAndUpdate(session.user.id, {
    ibkrPendingImport: [],
    ibkrPendingSkipped: 0,
  });

  return NextResponse.json({ success: true });
}
