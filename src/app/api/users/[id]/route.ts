import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import { levelInfo, titleLabel } from "@/lib/challenges";

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

  // Activity totals from real (non-simulated) trades: total count + distinct
  // journaled days (UTC), the same basis as activityXp() and the board.
  const agg = await Trade.aggregate<{ trades: number; days: number }>([
    { $match: { userID: user._id, simulated: false } },
    {
      $group: {
        _id: {
          d: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $ifNull: ["$dateClosed", "$dateBought"] },
              timezone: "UTC",
            },
          },
        },
        c: { $sum: 1 },
      },
    },
    { $group: { _id: null, trades: { $sum: "$c" }, days: { $sum: 1 } } },
  ]);
  const trades = agg[0]?.trades ?? 0;
  const activeDays = agg[0]?.days ?? 0;

  const activityXp = trades * 10 + activeDays * 10;
  const info = levelInfo((user.xp ?? 0) + activityXp);

  const first = (user.firstname ?? "").trim();
  const lastInitial = (user.surname ?? "").trim().charAt(0).toUpperCase();
  const name = lastInitial ? `${first} ${lastInitial}.` : first || "Trader";
  const title = (user.equippedTitle ?? "").trim() || titleLabel(info.level);
  const todayUtc = new Date().toISOString().slice(0, 10);

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
  };

  return NextResponse.json(profile);
}
