import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import { CHALLENGES, levelInfo, titleLabel } from "@/lib/challenges";
import { TROPHIES, type TrophyStats } from "@/lib/trophies";
import { friendState, type FriendStatus } from "@/lib/friends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public profile for a single user. Only users who have opted into the
// leaderboard are visible - that opt-in is the consent to be seen by others
// (the leaderboard is the only place these profiles are reached from). All
// stats are process/discipline based, never P/L, matching the leaderboard.

export type PublicProfile = {
  id: string;
  name: string; // "First L."
  avatarColor: string;
  avatarFrame: string;
  title: string;
  level: number;
  totalXp: number;
  into: number; // XP into the current level
  per: number; // XP needed to fill the current level
  trades: number;
  activeDays: number;
  streakCurrent: number;
  streakLongest: number;
  challengesCompleted: number;
  memberSince: string; // ISO date
  isMe: boolean;
  // The caller's friend relationship with this user.
  friendStatus: FriendStatus;
  // Earned milestone trophies ("medals") and the total available.
  medals: { id: string; label: string; icon: string }[];
  medalsTotal: number;
};

// A streak counts as alive when its last completed day is within a day of
// UTC-today (mirrors the leaderboard's tz-slack rule).
function liveStreak(
  s: { current?: number; lastDate?: string } | undefined,
  todayUtc: string,
): number {
  const current = s?.current ?? 0;
  const last = s?.lastDate ?? "";
  if (!current || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return 0;
  const diff = Math.round(
    (Date.parse(`${todayUtc}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) /
      86_400_000,
  );
  return Math.abs(diff) <= 1 ? current : 0;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDb();
  const user = await User.findOne({ _id: id, leaderboardOptIn: true })
    .select(
      "firstname surname avatarColor avatarFrame equippedTitle xp affirmationStreak challengeClaims",
    )
    .lean<{
      _id: mongoose.Types.ObjectId;
      firstname?: string;
      surname?: string;
      avatarColor?: string;
      avatarFrame?: string;
      equippedTitle?: string;
      xp?: number;
      affirmationStreak?: { current: number; longest: number; lastDate: string };
      challengeClaims?: { id: string; claimedAt: Date }[];
    }>();

  // 404 both when the user doesn't exist and when they haven't opted in -
  // don't reveal the difference.
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Load the user's real (non-simulated) trades once and derive everything:
  // activity totals (for level/XP) and the trophy stats (for medals).
  const tradeDocs = await Trade.find({ userID: user._id, simulated: false })
    .select("status symbol dateBought dateClosed")
    .lean<
      {
        status: string;
        symbol?: string | null;
        dateBought?: string | Date | null;
        dateClosed?: string | Date | null;
      }[]
    >();

  const dayKeys = new Set<string>();
  const monthKeys = new Set<string>();
  const symbols = new Set<string>();
  let closedTrades = 0;
  let wins = 0;
  for (const t of tradeDocs) {
    const d = t.dateClosed ?? t.dateBought;
    if (d) {
      const iso = new Date(d).toISOString();
      dayKeys.add(iso.slice(0, 10));
      monthKeys.add(iso.slice(0, 7));
    }
    if (t.symbol) symbols.add(String(t.symbol).toUpperCase());
    if (t.status === "WIN" || t.status === "LOSS") {
      closedTrades += 1;
      if (t.status === "WIN") wins += 1;
    }
  }
  const trades = tradeDocs.length;
  const activeDays = dayKeys.size;

  const activityXp = trades * 10 + activeDays * 10;
  const info = levelInfo((user.xp ?? 0) + activityXp);

  // Earned milestone trophies, evaluated from the same stats the trophies
  // page uses (never P/L).
  const trophyStats: TrophyStats = {
    totalTrades: trades,
    closedTrades,
    wins,
    months: monthKeys.size,
    symbols: symbols.size,
    level: info.level,
    levelTitle: info.title,
    claimedCount: user.challengeClaims?.length ?? 0,
    totalChallenges: CHALLENGES.length,
  };
  const medals = TROPHIES.filter((t) => t.earned(trophyStats)).map((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
  }));

  const first = (user.firstname ?? "").trim();
  const lastInitial = (user.surname ?? "").trim().charAt(0).toUpperCase();
  const name = lastInitial ? `${first} ${lastInitial}.` : first || "Trader";
  const title = (user.equippedTitle ?? "").trim() || titleLabel(info.level);
  const todayUtc = new Date().toISOString().slice(0, 10);
  const friendStatus = await friendState(session.user.id, String(user._id));

  const profile: PublicProfile = {
    id: String(user._id),
    name,
    avatarColor: user.avatarColor ?? "teal",
    avatarFrame: user.avatarFrame ?? "none",
    title,
    level: info.level,
    totalXp: info.totalXp,
    into: info.into,
    per: info.per,
    trades,
    activeDays,
    streakCurrent: liveStreak(user.affirmationStreak, todayUtc),
    streakLongest: user.affirmationStreak?.longest ?? 0,
    challengesCompleted: user.challengeClaims?.length ?? 0,
    // ObjectId carries its creation time; use it as "member since" since the
    // schema has no separate createdAt.
    memberSince: user._id.getTimestamp().toISOString(),
    isMe: String(user._id) === session.user.id,
    friendStatus,
    medals,
    medalsTotal: TROPHIES.length,
  };

  return NextResponse.json(profile);
}
