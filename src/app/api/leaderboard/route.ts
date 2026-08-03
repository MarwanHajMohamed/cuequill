import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import { levelInfo, titleLabel } from "@/lib/challenges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A single ranked competitor. All three metrics travel together so the
// client can re-sort per tab without another round trip.
export type LeaderboardEntry = {
  id: string;
  name: string; // "First L." — last initial only
  avatarColor: string;
  avatarFrame: string;
  title: string; // equipped title, else the level title
  level: number;
  totalXp: number;
  trades: number;
  streak: number; // live (alive) affirmation streak in days
  isMe: boolean;
};

// A streak counts on the board only while it's still alive. We don't know
// each user's timezone here, so treat it as alive when its last completed
// day is within a day of UTC-today either side (covers tz slack).
function liveStreak(
  s: { current?: number; lastDate?: string } | undefined,
  todayUtc: string,
): number {
  const current = s?.current ?? 0;
  const last = s?.lastDate ?? "";
  if (!current || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return 0;
  const a = Date.parse(`${last}T00:00:00Z`);
  const b = Date.parse(`${todayUtc}T00:00:00Z`);
  const diffDays = Math.round((b - a) / 86_400_000);
  return Math.abs(diffDays) <= 1 ? current : 0;
}

// GET /api/leaderboard — the ranked entries for every user who has opted in,
// each carrying all three ranking metrics, plus whether the caller is opted
// in so the page can show a "join" prompt.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const meId = session.user.id;

  const users = await User.find({ leaderboardOptIn: true })
    .select(
      "firstname surname avatarColor avatarFrame equippedTitle xp affirmationStreak",
    )
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        firstname?: string;
        surname?: string;
        avatarColor?: string;
        avatarFrame?: string;
        equippedTitle?: string;
        xp?: number;
        affirmationStreak?: { current: number; longest: number; lastDate: string };
      }[]
    >();

  const optedIn = users.some((u) => String(u._id) === meId);

  if (users.length === 0) {
    return NextResponse.json({ entries: [], optedIn });
  }

  const ids = users.map((u) => u._id);

  // Per-user activity totals from real trades: total count + distinct
  // journaled days (UTC), matching activityXp() in challenges.ts exactly
  // (10 XP per trade + 10 XP per distinct day). One aggregation for all
  // opted-in users rather than pulling every trade document.
  const agg = await Trade.aggregate<{
    _id: mongoose.Types.ObjectId;
    trades: number;
    days: number;
  }>([
    { $match: { userID: { $in: ids }, simulated: false } },
    {
      $group: {
        _id: {
          u: "$userID",
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
    { $group: { _id: "$_id.u", trades: { $sum: "$c" }, days: { $sum: 1 } } },
  ]);

  const activity = new Map<string, { trades: number; days: number }>();
  for (const a of agg) {
    activity.set(String(a._id), { trades: a.trades, days: a.days });
  }

  const todayUtc = new Date().toISOString().slice(0, 10);

  const entries: LeaderboardEntry[] = users.map((u) => {
    const uid = String(u._id);
    const act = activity.get(uid) ?? { trades: 0, days: 0 };
    const activityXp = act.trades * 10 + act.days * 10;
    const info = levelInfo((u.xp ?? 0) + activityXp);
    const first = (u.firstname ?? "").trim();
    const lastInitial = (u.surname ?? "").trim().charAt(0).toUpperCase();
    const name = lastInitial ? `${first} ${lastInitial}.` : first || "Trader";
    const title =
      (u.equippedTitle ?? "").trim() || titleLabel(info.level);
    return {
      id: uid,
      name,
      avatarColor: u.avatarColor ?? "teal",
      avatarFrame: u.avatarFrame ?? "none",
      title,
      level: info.level,
      totalXp: info.totalXp,
      trades: act.trades,
      streak: liveStreak(u.affirmationStreak, todayUtc),
      isMe: uid === meId,
    };
  });

  return NextResponse.json({ entries, optedIn });
}

// PATCH /api/leaderboard — join or leave the leaderboard.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { optIn?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.optIn !== "boolean") {
    return NextResponse.json(
      { error: "optIn (boolean) is required" },
      { status: 400 },
    );
  }

  await connectDb();
  await User.updateOne(
    { _id: session.user.id },
    { $set: { leaderboardOptIn: body.optIn } },
  );

  return NextResponse.json({ optedIn: body.optIn });
}
