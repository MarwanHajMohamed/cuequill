import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import { CHALLENGES, levelInfo, type EvalTrade } from "@/lib/challenges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/challenges — every challenge with the user's current progress
// and claim state, plus their XP / level. Progress is computed from real
// (non-simulated) trades only, so simulated trades can't farm rewards.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();

  const [trades, user] = await Promise.all([
    Trade.find({
      userID: new mongoose.Types.ObjectId(session.user.id),
      simulated: false,
    })
      .select("status symbol notes tags strategy dateBought dateClosed")
      .lean<EvalTrade[]>(),
    User.findById(session.user.id)
      .select("xp challengeClaims bonusChatMessages")
      .lean<{
        xp?: number;
        challengeClaims?: { id: string; claimedAt: Date }[];
        bonusChatMessages?: number;
      }>(),
  ]);

  const claimed = new Set((user?.challengeClaims ?? []).map((c) => c.id));
  const level = levelInfo(user?.xp ?? 0).level;

  const challenges = CHALLENGES.map((c) => {
    const minLevel = c.minLevel ?? 1;
    const locked = minLevel > level;
    const progress = c.progress(trades ?? []);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      category: c.category,
      target: c.target,
      xp: c.xp,
      reward: c.reward ?? null,
      minLevel,
      locked,
      progress,
      complete: !locked && progress >= c.target,
      claimed: claimed.has(c.id),
    };
  });

  return NextResponse.json({
    challenges,
    ...levelInfo(user?.xp ?? 0),
    bonusMessages: user?.bonusChatMessages ?? 0,
    claimable: challenges.filter((c) => c.complete && !c.claimed).length,
    badges: challenges.filter((c) => c.claimed).map((c) => c.id),
  });
}
