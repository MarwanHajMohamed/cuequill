import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Strategy, { FREE_STRATEGY_LIMIT } from "@/lib/models/Strategy";
import { User } from "@/lib/models/User";
import { parseBundle, type ExportedStrategy } from "@/lib/strategyTransfer";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Give every schematic element and example a fresh id on import so ids never
// collide with existing content and stay unique within the new document.
function reId(s: ExportedStrategy): ExportedStrategy {
  return {
    ...s,
    schematic: {
      ...s.schematic,
      elements: s.schematic.elements.map((el) => ({ ...el, id: randomUUID() })),
    },
    examples: s.examples.map((ex) => ({ ...ex, id: randomUUID() })),
  };
}

// Ensure a name is unique for this user (the model enforces a case-insensitive
// unique index). `taken` is the lowercased set of names already in use — both
// pre-existing and ones claimed earlier in this same batch.
function uniqueName(name: string, taken: Set<string>): string {
  const base = name.trim() || "Imported strategy";
  let candidate = base;
  if (taken.has(candidate.toLowerCase())) {
    candidate = `${base} (imported)`;
  }
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base} (imported ${n})`;
    n += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

// POST /api/strategies/import — create new strategies from an uploaded bundle.
// Accepts a full bundle, a bare array, or a single strategy object.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const incoming = parseBundle(body);
  if (incoming.length === 0) {
    return NextResponse.json(
      { error: "No importable strategies found in that file" },
      { status: 400 },
    );
  }

  await connectDb();

  // Free-tier cap: import only up to the remaining slots, reporting the rest
  // as skipped rather than failing the whole upload.
  const [proUser, existing] = await Promise.all([
    User.findById(userId).select("isPro").lean<{ isPro?: boolean }>(),
    Strategy.find({ userId }).select("name").lean<{ name: string }[]>(),
  ]);

  let skippedCap = 0;
  let toCreate = incoming;
  if (!proUser?.isPro) {
    const remaining = Math.max(0, FREE_STRATEGY_LIMIT - existing.length);
    if (remaining === 0) {
      return NextResponse.json(
        {
          error: `Free plan is capped at ${FREE_STRATEGY_LIMIT} strategies. Delete one or upgrade to Pro to import.`,
          code: "FREE_LIMIT",
        },
        { status: 402 },
      );
    }
    if (incoming.length > remaining) {
      skippedCap = incoming.length - remaining;
      toCreate = incoming.slice(0, remaining);
    }
  }

  const taken = new Set(existing.map((s) => s.name.toLowerCase()));
  const docs = toCreate.map((s) => {
    const clean = reId(s);
    return {
      userId: new mongoose.Types.ObjectId(userId),
      name: uniqueName(clean.name, taken),
      direction: clean.direction,
      timeframes: clean.timeframes,
      description: clean.description,
      tags: clean.tags,
      schematic: clean.schematic,
      examples: clean.examples,
    };
  });

  try {
    const created = await Strategy.insertMany(docs, { ordered: false });
    return NextResponse.json(
      { imported: created.length, skippedCap },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to import strategies",
      },
      { status: 400 },
    );
  }
}
