import mongoose from "mongoose";
import { Friendship } from "@/lib/models/Friendship";

// Friend-relationship helpers, shared by the friends API, the profile card,
// and the friends leaderboard. Callers connect to the DB first.

export type FriendStatus =
  | "self"
  | "friends"
  | "outgoing" // I sent a pending request
  | "incoming" // they sent me a pending request
  | "none";

// The relationship between the caller and another user.
export async function friendState(
  meId: string,
  otherId: string,
): Promise<FriendStatus> {
  if (meId === otherId) return "self";
  const me = new mongoose.Types.ObjectId(meId);
  const other = new mongoose.Types.ObjectId(otherId);
  const rel = await Friendship.findOne({
    $or: [
      { requester: me, recipient: other },
      { requester: other, recipient: me },
    ],
  }).lean<{ requester: mongoose.Types.ObjectId; status: string } | null>();
  if (!rel) return "none";
  if (rel.status === "accepted") return "friends";
  return String(rel.requester) === meId ? "outgoing" : "incoming";
}

// Accepted-friend user ids for a user (as strings).
export async function getFriendIds(meId: string): Promise<string[]> {
  const me = new mongoose.Types.ObjectId(meId);
  const rels = await Friendship.find({
    status: "accepted",
    $or: [{ requester: me }, { recipient: me }],
  })
    .select("requester recipient")
    .lean<
      { requester: mongoose.Types.ObjectId; recipient: mongoose.Types.ObjectId }[]
    >();
  return rels.map((r) =>
    String(r.requester) === meId ? String(r.recipient) : String(r.requester),
  );
}
