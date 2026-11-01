import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import RulesBoard from "@/lib/models/RulesBoard";
import { User } from "@/lib/models/User";
import { NextRequest, NextResponse } from "next/server";

async function requirePro(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  await connectDb();
  const u = await User.findById(session.user.id)
    .select("isPro")
    .lean<{ isPro?: boolean }>();
  if (!u?.isPro) {
    return { ok: false, status: 403, error: "Pro membership required" };
  }
  return { ok: true, userId: session.user.id };
}

type RuleInput = { id?: string; title?: unknown; body?: unknown };
type SectionInput = { id?: string; title?: unknown; rules?: unknown };

// Normalise whatever the client sends into the stored shape, dropping
// anything malformed so a bad payload can't corrupt the board.
function sanitize(sections: unknown) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((s: SectionInput) => ({
      id: typeof s?.id === "string" && s.id ? s.id : randomUUID(),
      title: String(s?.title ?? "").trim() || "Untitled section",
      rules: Array.isArray(s?.rules)
        ? (s.rules as RuleInput[])
            .filter((r) => String(r?.title ?? "").trim())
            .map((r) => ({
              id: typeof r?.id === "string" && r.id ? r.id : randomUUID(),
              title: String(r.title).trim(),
              body: String(r?.body ?? "").trim(),
            }))
        : [],
    }))
    .filter((s) => s.title || s.rules.length);
}

// Get the user's board. New accounts start with no rules; the doc is
// created lazily on the first PUT (the upsert below), so a fresh user
// just gets an empty sections array back and adds their own from there.
export async function GET() {
  const gate = await requirePro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { userId } = gate;

  try {
    const board = await RulesBoard.findOne({ userId });
    return NextResponse.json({ sections: board?.sections ?? [] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch rules";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Replace the whole board (used for every add/edit/move/reorder).
export async function PUT(req: NextRequest) {
  const gate = await requirePro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { userId } = gate;

  try {
    const body = await req.json();
    const sections = sanitize(body.sections);
    const board = await RulesBoard.findOneAndUpdate(
      { userId },
      { sections },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ sections: board.sections });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save rules";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
