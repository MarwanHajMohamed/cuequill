import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy from "@/lib/models/Strategy";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  return { ok: true as const, userId: session.user.id };
}

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await connectDb();
  const strategy = await Strategy.findOne({
    _id: id,
    userId: auth.userId,
  }).lean();
  if (!strategy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ strategy });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await connectDb();
  const body = await req.json().catch(() => ({}));

  // Sparse $set — only known fields the client sent.
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 },
      );
    }
    patch.name = n;
  }
  if (body.direction === "CALL" || body.direction === "PUT") {
    patch.direction = body.direction;
  }
  if (Array.isArray(body.timeframes)) {
    patch.timeframes = body.timeframes.map(String);
  }
  if (typeof body.description === "string") {
    patch.description = body.description;
  }
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags.map(String);
  }
  if (body.schematic && typeof body.schematic === "object") {
    patch.schematic = body.schematic;
  }
  if (Array.isArray(body.examples)) {
    // Keep only well-formed example entries.
    patch.examples = (body.examples as unknown[])
      .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
      .filter(
        (e) =>
          typeof e.src === "string" &&
          (e.outcome === "Successful" || e.outcome === "Unsuccessful"),
      )
      .map((e) => ({
        id: typeof e.id === "string" ? e.id : randomUUID(),
        src: e.src as string,
        outcome: e.outcome as "Successful" | "Unsuccessful",
        ...(typeof e.caption === "string" ? { caption: e.caption } : {}),
      }));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await Strategy.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      { $set: patch },
      { new: true },
    );
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ strategy: updated });
  } catch (err) {
    const message =
      err instanceof Error && /duplicate/i.test(err.message)
        ? "A strategy with that name already exists"
        : err instanceof Error
          ? err.message
          : "Failed to update strategy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await connectDb();
  const result = await Strategy.deleteOne({
    _id: id,
    userId: auth.userId,
  });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
