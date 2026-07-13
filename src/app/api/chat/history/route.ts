import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import ChatConversation from "@/lib/models/ChatConversation";
import type { StoredChatMessage } from "@/lib/models/ChatConversation";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cap stored history so the conversation document can't grow unbounded.
// Older turns fall off the top; the model already only receives what the
// client sends per request.
const MAX_STORED_MESSAGES = 200;

function sanitize(input: unknown): StoredChatMessage[] {
  if (!Array.isArray(input)) return [];
  const clean = input
    .map((raw) => {
      const m = (raw ?? {}) as Partial<StoredChatMessage>;
      const role = m.role === "model" ? "model" : m.role === "user" ? "user" : null;
      if (!role) return null;
      return { role, text: String(m.text ?? "") };
    })
    .filter((m): m is StoredChatMessage => m !== null);
  return clean.slice(-MAX_STORED_MESSAGES);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const convo = await ChatConversation.findOne({
    userId: session.user.id,
  }).lean<{ messages: StoredChatMessage[] } | null>();
  return NextResponse.json({ messages: convo?.messages ?? [] });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const messages = sanitize(body.messages);

  await connectDb();
  await ChatConversation.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(session.user.id) },
    { $set: { messages } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return NextResponse.json({ ok: true, count: messages.length });
}
