import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { commitPendingImport } from "@/lib/ibkrSync";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Commit the trades staged by the last preview (POST /api/ibkr/sync).
// Inserts exactly what the user reviewed - no IBKR call, so no cooldown.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await commitPendingImport(session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
