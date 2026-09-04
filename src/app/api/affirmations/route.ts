import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { getProStatus } from "@/lib/pro";

export const runtime = "nodejs";

// Affirmations are a Pro feature. The client blurs the page for free
// users, but that's cosmetic - the real gate is here, so the API can't be
// hit directly. 401 = signed out, 403 = signed in but not Pro.
async function gate(): Promise<
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }
> {
  const { userId, isPro } = await getProStatus();
  if (!userId) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isPro) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Pro membership required" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, userId };
}

const MAX_COUNT = 50;
const MAX_LEN = 280;

// Normalize an incoming list: trim, drop empties, cap length, dedupe
// (case-insensitive), and cap the count. Affirmations are free text, so
// no character-set restriction - just guardrails.
function clean(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (typeof raw !== "string") continue;
    const s = raw.trim().slice(0, MAX_LEN);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_COUNT) break;
  }
  return out;
}

export async function GET() {
  const g = await gate();
  if (!g.ok) return g.res;
  await connectDb();
  const user = await User.findById(g.userId)
    .select("affirmations affirmationsRead affirmationStreak")
    .lean<{
      affirmations?: string[];
      affirmationsRead?: { date: string; texts: string[] };
      affirmationStreak?: {
        current: number;
        longest: number;
        lastDate: string;
      };
    }>();
  // Empty by default - new accounts start with no affirmations.
  return NextResponse.json({
    affirmations: user?.affirmations ?? [],
    read: user?.affirmationsRead ?? { date: "", texts: [] },
    streak: user?.affirmationStreak ?? {
      current: 0,
      longest: 0,
      lastDate: "",
    },
  });
}

export async function PUT(req: Request) {
  const g = await gate();
  if (!g.ok) return g.res;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const affirmations = clean(
    (body as { affirmations?: unknown })?.affirmations,
  );
  await connectDb();
  await User.findByIdAndUpdate(g.userId, { affirmations });
  return NextResponse.json({ affirmations });
}
