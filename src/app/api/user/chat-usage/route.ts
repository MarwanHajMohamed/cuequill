import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import {
  DAILY_MESSAGE_LIMIT,
  MONTHLY_TOKEN_LIMIT,
  dayKey,
  monthKey,
} from "@/lib/chatLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quill AI fair-use counters for the signed-in user. Counters reset
// lazily (the chat route only bumps them), so a stored key that differs
// from the current day/month means the count is effectively zero.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const u = await User.findById(session.user.id)
    .select(
      "chatDailyDate chatDailyCount chatMonth chatMonthTokens bonusChatMessages",
    )
    .lean<{
      chatDailyDate?: string;
      chatDailyCount?: number;
      chatMonth?: string;
      chatMonthTokens?: number;
      bonusChatMessages?: number;
    }>();

  const today = dayKey();
  const month = monthKey();
  const messagesToday =
    u?.chatDailyDate === today ? (u.chatDailyCount ?? 0) : 0;
  const tokensThisMonth =
    u?.chatMonth === month ? (u.chatMonthTokens ?? 0) : 0;

  return NextResponse.json({
    messagesToday,
    dailyLimit: DAILY_MESSAGE_LIMIT,
    tokensThisMonth,
    monthlyTokenLimit: MONTHLY_TOKEN_LIMIT,
    bonusMessages: u?.bonusChatMessages ?? 0,
    month,
  });
}
