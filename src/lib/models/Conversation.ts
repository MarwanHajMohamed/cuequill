import mongoose, { Schema, Document } from "mongoose";

// A single Quill AI conversation thread. Unlike the earlier one-doc-per-
// user ChatConversation, a user can have many of these — the chat page
// lists them as history and lets the user switch / start new ones.
export type ChatRole = "user" | "model";

export interface StoredChatMessage {
  role: ChatRole;
  text: string;
}

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: StoredChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<StoredChatMessage>(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    text: { type: String, default: "" },
  },
  { _id: false },
);

const ConversationSchema = new Schema<IConversation>(
  {
    // Indexed (NOT unique) — many conversations per user, listed newest
    // first by updatedAt.
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, default: "New chat" },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

ConversationSchema.index({ userId: 1, updatedAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Conversation) {
  mongoose.deleteModel("Conversation");
}

const Conversation =
  (mongoose.models.Conversation as mongoose.Model<IConversation>) ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;

// Derive a short title from the first user message. Used when a
// conversation is saved while still untitled.
export function deriveTitle(messages: StoredChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.text.trim());
  if (!firstUser) return "New chat";
  const t = firstUser.text.trim().replace(/\s+/g, " ");
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}

// Cap stored history so a single conversation document can't grow
// unbounded.
export const MAX_STORED_MESSAGES = 200;
