import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import {
  CHALLENGES,
  levelInfo,
  activityXp,
  type EvalTrade,
} from "@/lib/challenges";
import { TROPHIES, availableTitles, type TrophyStats } from "@/lib/trophies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/challenges - every challenge with the user's current progress
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
      .select(
        "status symbol notes tags strategy option dateBought dateClosed",
      )
      .lean<EvalTrade[]>(),
    User.findById(session.user.id)
      .select(
        "xp challengeClaims bonusChatMessages equippedTitle affirmationStreak",
      )
      .lean<{
        xp?: number;
        challengeClaims?: { id: string; claimedAt: Date }[];
        bonusChatMessages?: number;
        equippedTitle?: string;
        affirmationStreak?: {
          current: number;
          longest: number;
          lastDate: string;
        };
      }>(),
  ]);

  const claimed = new Set((user?.challengeClaims ?? []).map((c) => c.id));
  // Total XP = stored event XP (claims + streak) + derived activity XP.
  const totalXp = (user?.xp ?? 0) + activityXp(trades ?? []);
  const info = levelInfo(totalXp);
  const level = info.level;

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

  // Trophy stats - auto-earned status rewards derived from the same trades.
  const all = trades ?? [];
  const closed = all.filter((t) => t.status === "WIN" || t.status === "LOSS");
  const monthSet = new Set<string>();
  const symbolSet = new Set<string>();
  for (const t of all) {
    const d = t.dateClosed ?? t.dateBought;
    if (d) monthSet.add(new Date(d).toISOString().slice(0, 7));
    if (t.symbol) symbolSet.add(t.symbol.toUpperCase());
  }
  const stats: TrophyStats = {
    totalTrades: all.length,
    closedTrades: closed.length,
    wins: all.filter((t) => t.status === "WIN").length,
    months: monthSet.size,
    symbols: symbolSet.size,
    level,
    levelTitle: info.title,
    claimedCount: claimed.size,
    totalChallenges: CHALLENGES.length,
  };

  const trophies = TROPHIES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    icon: t.icon,
    title: t.title ?? null,
    earned: t.earned(stats),
  }));
  const titles = availableTitles(stats);
  // Keep the equipped title honest: drop it if the user no longer qualifies.
  const equippedTitle = titles.includes(user?.equippedTitle ?? "")
    ? user?.equippedTitle ?? ""
    : "";

  return NextResponse.json({
    challenges,
    ...info,
    bonusMessages: user?.bonusChatMessages ?? 0,
    claimable: challenges.filter((c) => c.complete && !c.claimed).length,
    badges: challenges.filter((c) => c.claimed).map((c) => c.id),
    trophies,
    titles,
    equippedTitle,
    streak: user?.affirmationStreak ?? { current: 0, longest: 0, lastDate: "" },
  });
}
