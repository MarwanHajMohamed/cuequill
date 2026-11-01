import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

const MAX_COUNT = 12;
const TITLE_MAX = 60;
const PROMPT_MAX = 1000;
const ICON_MAX = 60;
const DEFAULT_ICON = "fa-solid fa-bolt";

type Prompt = { id: string; icon: string; title: string; prompt: string };

function genId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Normalize an incoming shortcut list: keep only well-formed entries with a
// title AND prompt, trim/cap each field, and cap the count. Icon is a Font
// Awesome class string (rendered only back to the same user), defaulted when
// missing.
function clean(items: unknown): Prompt[] {
  if (!Array.isArray(items)) return [];
  const out: Prompt[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title =
      typeof r.title === "string" ? r.title.trim().slice(0, TITLE_MAX) : "";
    const prompt =
      typeof r.prompt === "string" ? r.prompt.trim().slice(0, PROMPT_MAX) : "";
    if (!title || !prompt) continue;
    const icon =
      typeof r.icon === "string" && r.icon.trim()
        ? r.icon.trim().slice(0, ICON_MAX)
        : DEFAULT_ICON;
    const id =
      typeof r.id === "string" && r.id.trim()
        ? r.id.trim().slice(0, 80)
        : genId();
    out.push({ id, icon, title, prompt });
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
    .select("chatPrompts")
    .lean<{ chatPrompts?: Prompt[] }>();
  // null → never customised (client falls back to its defaults); an array
  // (including empty) → the user's saved set.
  return NextResponse.json({ prompts: user?.chatPrompts ?? null });
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
  const prompts = clean((body as { prompts?: unknown })?.prompts);
  await connectDb();
  await User.findByIdAndUpdate(session.user.id, { chatPrompts: prompts });
  return NextResponse.json({ prompts });
}
