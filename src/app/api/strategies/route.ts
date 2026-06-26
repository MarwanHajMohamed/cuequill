import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy, {
  FREE_STRATEGY_LIMIT,
  SEED_STRATEGIES,
} from "@/lib/models/Strategy";
import { User } from "@/lib/models/User";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  return { ok: true as const, userId: session.user.id };
}

// Seed the user's library with the legacy strategy names on first
// access so brand-new accounts have something to pick from in the
// trade strategy dropdown. Safe to call repeatedly — only runs when
// the user has zero strategies.
async function seedIfEmpty(userId: string) {
  const count = await Strategy.countDocuments({ userId });
  if (count > 0) return;
  await Strategy.insertMany(
    SEED_STRATEGIES.map((s) => ({
      userId: new mongoose.Types.ObjectId(userId),
      name: s.name,
      direction: s.direction,
      timeframes: s.timeframes,
      description: "",
      tags: [],
      schematic: { width: 800, height: 480, elements: [] },
    })),
    { ordered: false },
  ).catch(() => {
    // Unique-index races between two parallel first-loads can land
    // here; the next read still returns the seeded set.
  });
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await connectDb();
  await seedIfEmpty(auth.userId);
  const strategies = await Strategy.find({ userId: auth.userId })
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
