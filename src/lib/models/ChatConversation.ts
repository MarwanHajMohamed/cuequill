import mongoose, { Schema, Document } from "mongoose";

// One running Quill AI conversation per user, stored server-side so it
// syncs across devices and never leaks between accounts on a shared
// browser (the old localStorage approach did both). Mirrors the single
// -conversation UX the chat page already has (one thread + a Clear
// button); the rows array is capped on write to bound the document.

export type ChatRole = "user" | "model";

export interface StoredChatMessage {
  role: ChatRole;
  text: string;
}

export interface IChatConversation extends Document {
  userId: mongoose.Types.ObjectId;
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

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

// Drop the hot-reload-cached model in dev so schema edits take effect
// without a full restart (same note as the other models).
if (process.env.NODE_ENV !== "production" && mongoose.models.ChatConversation) {
  mongoose.deleteModel("ChatConversation");
}

const ChatConversation =
  (mongoose.models.ChatConversation as mongoose.Model<IChatConversation>) ||
  mongoose.model<IChatConversation>("ChatConversation", ChatConversationSchema);

export default ChatConversation;
