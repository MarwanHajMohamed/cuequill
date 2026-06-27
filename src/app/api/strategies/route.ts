import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy, { FREE_STRATEGY_LIMIT } from "@/lib/models/Strategy";
import { User } from "@/lib/models/User";
import { STRATEGY_SEED_CONTENT } from "@/lib/strategySeed";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  return { ok: true as const, userId: session.user.id };
}

// Backfill the ported description + examples onto strategies that
// predate this content (seeded before the migration). Idempotent: each
// field is filled only when it's still empty, so user edits are never
// clobbered. Matching is by name, the same key the seed dataset uses.
async function backfillSeedContent(userId: string) {
  const names = Object.keys(STRATEGY_SEED_CONTENT);
  const stale = await Strategy.find({
    userId,
    name: { $in: names },
    $or: [
      { description: { $in: ["", null] } },
      { examples: { $exists: false } },
      { examples: { $size: 0 } },
    ],
  })
    .select("_id name description examples")
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        name: string;
        description?: string;
        examples?: unknown[];
      }[]
    >();
  if (stale.length === 0) return;
  const ops = stale.flatMap((s) => {
    const seed = STRATEGY_SEED_CONTENT[s.name];
    if (!seed) return [];
    const set: Record<string, unknown> = {};
    if (!s.description) set.description = seed.description;
    if (!s.examples || s.examples.length === 0) set.examples = seed.examples;
    if (Object.keys(set).length === 0) return [];
    return [{ updateOne: { filter: { _id: s._id }, update: { $set: set } } }];
  });
  if (ops.length === 0) return;
  await Strategy.bulkWrite(ops).catch(() => {
    // Best-effort; a failed backfill just means the next read retries.
  });
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await connectDb();
  // Note: accounts start with an empty library — no default strategies
  // are seeded. Existing seeded strategies still get their ported
  // content backfilled below.
  await backfillSeedContent(auth.userId);
  // Exclude the heavy description (inline images) and examples from the
  // list payload; they're only needed on the detail page, which fetches
  // the full doc.
  const strategies = await Strategy.find({ userId: auth.userId })
    .select("-description -examples")
    .sort({ direction: 1, name: 1 })
    .lean();
  return NextResponse.json({ strategies });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await connectDb();

  // Free tier cap. Pro is unlimited.
  const proUser = await User.findById(auth.userId)
    .select("isPro")
    .lean<{ isPro?: boolean }>();
  if (!proUser?.isPro) {
    const count = await Strategy.countDocuments({ userId: auth.userId });
    if (count >= FREE_STRATEGY_LIMIT) {
      return NextResponse.json(
        {
          error: `Free plan is capped at ${FREE_STRATEGY_LIMIT} strategies. Delete one or upgrade to Pro.`,
          code: "FREE_LIMIT",
        },
        { status: 402 },
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const direction = body.direction === "PUT" ? "PUT" : "CALL";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const created = await Strategy.create({
      userId: new mongoose.Types.ObjectId(auth.userId),
      name,
      direction,
      timeframes: Array.isArray(body.timeframes)
        ? body.timeframes.map(String)
        : [],
      description: typeof body.description === "string" ? body.description : "",
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      schematic: {
        width: 800,
        height: 480,
        elements: [
          // Seed with a single placeholder text node so the canvas
          // isn't visually empty when the editor opens.
          {
            id: randomUUID(),
            kind: "text",
            x: 40,
            y: 32,
            text: "Sketch your setup",
            color: "#9ca3af",
          },
        ],
      },
    });
    return NextResponse.json({ strategy: created }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error && /duplicate/i.test(err.message)
        ? "A strategy with that name already exists"
        : err instanceof Error
          ? err.message
          : "Failed to create strategy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
