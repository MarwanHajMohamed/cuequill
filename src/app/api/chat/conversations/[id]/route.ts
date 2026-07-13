import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Conversation, {
  deriveTitle,
  MAX_STORED_MESSAGES,
} from "@/lib/models/Conversation";
import type { StoredChatMessage } from "@/lib/models/Conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(input: unknown): StoredChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      const m = (raw ?? {}) as Partial<StoredChatMessage>;
      const role =
        m.role === "model" ? "model" : m.role === "user" ? "user" : null;
      if (!role) return null;
      return { role, text: String(m.text ?? "") };
    })
    .filter((m): m is StoredChatMessage => m !== null)
    .slice(-MAX_STORED_MESSAGES);
}

// Ownership is enforced on every op by scoping the query to userId, so a
// user can only ever read/write/delete their own conversations.
async function ownerScope(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, status: 401 };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false as const, status: 404 };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const scope = await ownerScope(id);
  if (!scope.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: scope.status });
  }
  await connectDb();
  const convo = await Conversation.findOne({
    _id: id,
    userId: scope.userId,
  }).lean<{ _id: mongoose.Types.ObjectId; title: string; messages: StoredChatMessage[] } | null>();
  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: convo._id.toString(),
    title: convo.title,
    messages: convo.messages ?? [],
  });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const scope = await ownerScope(id);
  if (!scope.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: scope.status });
  }
  const body = await req.json().catch(() => ({}));
  const messages = sanitize(body.messages);

  await connectDb();
  // Keep the title in sync: once there's a real first message, name the
  // thread after it (unless the user set a custom title we don't clobber
  // — we only auto-title while it's still the default "New chat").
  const existing = await Conversation.findOne({
    _id: id,
    userId: scope.userId,
  }).select("title");
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  existing.messages = messages;
  if (!existing.title || existing.title === "New chat") {
    existing.title = deriveTitle(messages);
  }
  await existing.save();

  return NextResponse.json({ ok: true, title: existing.title });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const scope = await ownerScope(id);
  if (!scope.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: scope.status });
  }
  await connectDb();
  await Conversation.deleteOne({ _id: id, userId: scope.userId });
  return NextResponse.json({ ok: true });
}
