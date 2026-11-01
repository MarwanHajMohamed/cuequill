import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { Friendship } from "@/lib/models/Friendship";
import { friendState, type FriendStatus } from "@/lib/friends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type FriendMini = {
  id: string;
  name: string; // "First L."
  avatarColor: string;
  avatarFrame: string;
};

async function miniProfiles(ids: string[]): Promise<Map<string, FriendMini>> {
  const map = new Map<string, FriendMini>();
  if (ids.length === 0) return map;
  const users = await User.find({ _id: { $in: ids } })
    .select("firstname surname avatarColor avatarFrame")
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        firstname?: string;
        surname?: string;
        avatarColor?: string;
        avatarFrame?: string;
      }[]
    >();
  for (const u of users) {
    const first = (u.firstname ?? "").trim();
    const li = (u.surname ?? "").trim().charAt(0).toUpperCase();
    map.set(String(u._id), {
      id: String(u._id),
      name: li ? `${first} ${li}.` : first || "Trader",
      avatarColor: u.avatarColor ?? "teal",
      avatarFrame: u.avatarFrame ?? "none",
    });
  }
  return map;
}

// GET /api/friends - the caller's accepted friends plus pending requests in
// both directions, each as a light identity for list rendering.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const me = new mongoose.Types.ObjectId(session.user.id);

  const rels = await Friendship.find({
    $or: [{ requester: me }, { recipient: me }],
  })
    .select("requester recipient status")
    .lean<
      {
        requester: mongoose.Types.ObjectId;
        recipient: mongoose.Types.ObjectId;
        status: string;
      }[]
    >();

  const friendIds: string[] = [];
  const incomingIds: string[] = [];
  const outgoingIds: string[] = [];
  for (const r of rels) {
    const otherId =
      String(r.requester) === session.user.id
        ? String(r.recipient)
        : String(r.requester);
    if (r.status === "accepted") friendIds.push(otherId);
    else if (String(r.requester) === session.user.id) outgoingIds.push(otherId);
    else incomingIds.push(otherId);
  }

  const minis = await miniProfiles([
    ...friendIds,
    ...incomingIds,
    ...outgoingIds,
  ]);
  const pick = (ids: string[]) =>
    ids.map((id) => minis.get(id)).filter(Boolean) as FriendMini[];

  return NextResponse.json({
    friends: pick(friendIds),
    incoming: pick(incomingIds),
    outgoing: pick(outgoingIds),
  });
}

// POST /api/friends - change a relationship. Body: { action, userId }.
// action: "request" | "accept" | "decline" | "cancel" | "remove".
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    userId?: string;
  };
  const action = body.action ?? "";
  const otherId = body.userId ?? "";
  const meId = session.user.id;

  if (!mongoose.Types.ObjectId.isValid(otherId) || otherId === meId) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  await connectDb();
  const target = await User.exists({ _id: otherId });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const me = new mongoose.Types.ObjectId(meId);
  const other = new mongoose.Types.ObjectId(otherId);

  switch (action) {
    case "request": {
      // If they already requested me, a request back accepts it (mutual).
      const reverse = await Friendship.findOne({
        requester: other,
        recipient: me,
      });
      if (reverse) {
        if (reverse.status === "pending") {
          reverse.status = "accepted";
          reverse.respondedAt = new Date();
          await reverse.save();
        }
        break;
      }
      // Otherwise create (or leave) my pending request. Upsert keeps it
      // idempotent and race-safe against the unique index.
      await Friendship.updateOne(
        { requester: me, recipient: other },
        { $setOnInsert: { status: "pending", createdAt: new Date() } },
        { upsert: true },
      );
      break;
    }
    case "accept": {
      await Friendship.updateOne(
        { requester: other, recipient: me, status: "pending" },
        { $set: { status: "accepted", respondedAt: new Date() } },
      );
      break;
    }
    case "decline": {
      // Remove their incoming request.
      await Friendship.deleteOne({
        requester: other,
        recipient: me,
        status: "pending",
      });
      break;
    }
    case "cancel": {
      // Withdraw my outgoing request.
      await Friendship.deleteOne({
        requester: me,
        recipient: other,
        status: "pending",
      });
      break;
    }
    case "remove": {
      // Unfriend - drop the accepted relationship whichever way it points.
      await Friendship.deleteOne({
        status: "accepted",
        $or: [
          { requester: me, recipient: other },
          { requester: other, recipient: me },
        ],
      });
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const status: FriendStatus = await friendState(meId, otherId);
  return NextResponse.json({ status });
}
