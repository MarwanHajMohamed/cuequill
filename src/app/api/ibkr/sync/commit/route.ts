import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { commitPendingImport } from "@/lib/ibkrSync";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Commit staged trades (POST /api/ibkr/sync). No IBKR call, so no cooldown.
// Body { keys?: string[] }: with keys, import exactly those staged trades
// (new or skipped); without, import every new trade and leave the skipped
// ones staged.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const keys = Array.isArray(body?.keys)
    ? (body.keys as unknown[]).filter((k): k is string => typeof k === "string")
    : undefined;

  try {
    const result = await commitPendingImport(session.user.id, keys);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
