import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

const MAX_COUNT = 50;
const MAX_LEN = 280;

// Normalize an incoming list: trim, drop empties, cap length, dedupe
// (case-insensitive), and cap the count. Affirmations are free text, so
// no character-set restriction — just guardrails.
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const user = await User.findById(session.user.id)
    .select("affirmations affirmationsRead")
    .lean<{
      affirmations?: string[];
      affirmationsRead?: { date: string; texts: string[] };
    }>();
  // Empty by default — new accounts start with no affirmations.
  return NextResponse.json({
    affirmations: user?.affirmations ?? [],
    read: user?.affirmationsRead ?? { date: "", texts: [] },
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  await User.findByIdAndUpdate(session.user.id, { affirmations });
  return NextResponse.json({ affirmations });
}
