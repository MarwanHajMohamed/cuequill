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

// GET → the user's saved backtests (newest first, config included).
export async function GET() {
  const gate = await requirePro();
  if (!gate.ok) return gateError(gate.status);

  const docs = await Backtest.find({ userId: gate.userId })
    .sort({ updatedAt: -1 })
    .lean();
  const items = docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    config: d.config,
    updatedAt: d.updatedAt,
  }));
  return NextResponse.json({ items });
}

// POST { name, config } → create a saved backtest.
export async function POST(req: NextRequest) {
  const gate = await requirePro();
  if (!gate.ok) return gateError(gate.status);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, config } = (body ?? {}) as { name?: unknown; config?: unknown };
  if (typeof name !== "string" || !name.trim() || typeof config !== "object") {
    return NextResponse.json(
      { error: "name and config are required" },
      { status: 400 },
    );
  }

  const created = await Backtest.create({
    userId: gate.userId,
    name: name.trim().slice(0, 120),
    config,
  });
  return NextResponse.json({
    id: String(created._id),
    name: created.name,
    config: created.config,
    updatedAt: created.updatedAt,
  });
}
