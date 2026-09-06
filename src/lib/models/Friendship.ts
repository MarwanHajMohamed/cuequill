import mongoose, { Schema, Document } from "mongoose";

// A friendship / friend request between two users. One document per pair:
// `requester` sent it to `recipient`. status "pending" is an outstanding
// request; "accepted" means they're friends (queried in both directions).
// A unique index on the ordered pair stops duplicates; app logic also checks
// the reverse direction before creating one.

export type FriendshipStatus = "pending" | "accepted";

export interface IFriendship extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: FriendshipStatus;
  createdAt: Date;
  respondedAt?: Date;
}

const FriendshipSchema = new Schema<IFriendship>({
  requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "accepted"], default: "pending" },
  createdAt: { type: Date, default: () => new Date() },
  respondedAt: { type: Date },
});

// At most one relationship row per (requester, recipient) direction.
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && mongoose.models.Friendship) {
  mongoose.deleteModel("Friendship");
}

export const Friendship =
  mongoose.models.Friendship ||
  mongoose.model<IFriendship>("Friendship", FriendshipSchema);
