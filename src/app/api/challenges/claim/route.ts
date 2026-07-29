import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import { CHALLENGE_MAP, levelInfo, type EvalTrade } from "@/lib/challenges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/challenges/claim { id } — award a completed challenge's XP,
// once. Re-verifies completion server-side from real trades so a claim
// can't be forged, and guards against double-claim.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const def = CHALLENGE_MAP[id];
  if (!def) {
    return NextResponse.json({ error: "Unknown challenge" }, { status: 400 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "xp challengeClaims bonusChatMessages",
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if ((user.challengeClaims ?? []).some((c: { id: string }) => c.id === id)) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  // Level-gated challenges can't be claimed until the account reaches the
  // required level.
  if ((def.minLevel ?? 1) > levelInfo(user.xp ?? 0).level) {
    return NextResponse.json(
      { error: `Reach level ${def.minLevel} to unlock this challenge` },
      { status: 400 },
    );
  }

  const trades = await Trade.find({
    userID: new mongoose.Types.ObjectId(session.user.id),
    simulated: false,
  })
    .select("status symbol notes tags strategy dateBought dateClosed")
    .lean<EvalTrade[]>();

  if (def.progress(trades ?? []) < def.target) {
    return NextResponse.json(
      { error: "Challenge not complete yet" },
      { status: 400 },
    );
  }

  user.xp = (user.xp ?? 0) + def.xp;
  user.challengeClaims = [
    ...(user.challengeClaims ?? []),
    { id, claimedAt: new Date() },
  ];
  // Grant any bonus reward (currently Quill AI messages).
  if (def.reward?.kind === "chat") {
    user.bonusChatMessages = (user.bonusChatMessages ?? 0) + def.reward.amount;
  }
  await user.save();

  return NextResponse.json({
    success: true,
    awarded: def.xp,
    reward: def.reward ?? null,
    ...levelInfo(user.xp),
  });
}
