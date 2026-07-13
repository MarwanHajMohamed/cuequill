import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import StockTable, { DEFAULT_STOCKS } from "@/lib/models/StockTable";
import type { StockRow } from "@/lib/stocksSeed";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  return { ok: true as const, userId: session.user.id };
}

// Normalize an arbitrary client payload into clean rows. Every field is
// coerced to a trimmed string and each row is guaranteed an id, so a
// malformed body can't corrupt the stored table.
function sanitizeRows(input: unknown): StockRow[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 500).map((raw) => {
    const r = (raw ?? {}) as Partial<StockRow>;
    return {
      id: typeof r.id === "string" && r.id ? r.id : randomUUID(),
      name: String(r.name ?? "").trim(),
      cost: String(r.cost ?? "").trim(),
      volume: String(r.volume ?? "").trim(),
      distance: String(r.distance ?? "").trim(),
    };
  });
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await connectDb();

  let table = await StockTable.findOne({ userId: auth.userId }).lean<{
    rows: StockRow[];
  } | null>();

  // First visit: seed the user's table from the shared default list so
  // they start from the curated set rather than an empty grid.
  if (!table) {
    const seeded = DEFAULT_STOCKS.map((s) => ({ ...s, id: randomUUID() }));
    await StockTable.create({
      userId: new mongoose.Types.ObjectId(auth.userId),
      rows: seeded,
    }).catch(() => {
      // A concurrent first-load race can hit the unique index; ignore
      // and fall through to re-read below.
    });
    table = await StockTable.findOne({ userId: auth.userId }).lean<{
      rows: StockRow[];
    } | null>();
  }

  return NextResponse.json({ rows: table?.rows ?? [] });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await connectDb();

  const body = await req.json().catch(() => ({}));
  const rows = sanitizeRows(body.rows);

  const updated = await StockTable.findOneAndUpdate(
    { userId: auth.userId },
    { $set: { rows } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean<{ rows: StockRow[] }>();

  return NextResponse.json({ rows: updated?.rows ?? rows });
}
