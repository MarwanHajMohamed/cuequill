import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Conversation, { deriveTitle } from "@/lib/models/Conversation";
import type { StoredChatMessage } from "@/lib/models/Conversation";
import ChatConversation from "@/lib/models/ChatConversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time migration: the previous design stored a single conversation
// per user in ChatConversation. If a user has that but no new-style
// Conversations yet, port it over so their existing chat isn't lost.
async function migrateLegacy(userId: string) {
  const count = await Conversation.countDocuments({ userId });
  if (count > 0) return;
  const legacy = await ChatConversation.findOne({ userId }).lean<{
    messages?: StoredChatMessage[];
  } | null>();
  if (legacy?.messages && legacy.messages.length > 0) {
    await Conversation.create({
      userId: new mongoose.Types.ObjectId(userId),
      title: deriveTitle(legacy.messages),
      messages: legacy.messages,
    });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  await migrateLegacy(session.user.id);

  const conversations = await Conversation.find({ userId: session.user.id })
    .select("title updatedAt")
    .sort({ updatedAt: -1 })
    .lean<{ _id: mongoose.Types.ObjectId; title: string; updatedAt: Date }[]>();

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const created = await Conversation.create({
    userId: new mongoose.Types.ObjectId(session.user.id),
    title: "New chat",
    messages: [],
  });
  return NextResponse.json({
    id: String(created._id),
    title: created.title,
    updatedAt: created.updatedAt,
  });
}
