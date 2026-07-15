import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { Backtest } from "@/lib/models/Backtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requirePro() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, status: 401 };
  await connectDb();
  const u = await User.findById(session.user.id)
    .select("isPro")
    .lean<{ isPro?: boolean }>();
  if (!u?.isPro) return { ok: false as const, status: 403 };
  return { ok: true as const, userId: session.user.id };
}

const gateError = (status: number) =>
  NextResponse.json(
    { error: status === 403 ? "Pro membership required" : "Unauthorized" },
    { status },
  );

// PUT { name?, config? } → update a saved backtest (scoped to the owner).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requirePro();
  if (!gate.ok) return gateError(gate.status);
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, config } = (body ?? {}) as { name?: unknown; config?: unknown };
  const update: { name?: string; config?: unknown } = {};
  if (typeof name === "string" && name.trim())
    update.name = name.trim().slice(0, 120);
  if (config && typeof config === "object") update.config = config;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const doc = await Backtest.findOneAndUpdate(
    { _id: id, userId: gate.userId },
    update,
    { new: true },
  );
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: String(doc._id),
    name: doc.name,
    config: doc.config,
    updatedAt: doc.updatedAt,
  });
}

// DELETE → remove a saved backtest (scoped to the owner).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requirePro();
  if (!gate.ok) return gateError(gate.status);
  const { id } = await params;
  const res = await Backtest.deleteOne({ _id: id, userId: gate.userId });
  if (res.deletedCount === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
