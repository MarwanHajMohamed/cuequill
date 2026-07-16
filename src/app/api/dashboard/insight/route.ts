import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import Goal from "@/lib/models/Goal";
import RulesBoard from "@/lib/models/RulesBoard";
import Strategy from "@/lib/models/Strategy";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildTradeContext,
  buildRulesContext,
  buildStrategiesContext,
  buildGoalsContext,
  type LeanTrade,
  type LeanRulesBoard,
  type LeanStrategy,
  type LeanGoal,
} from "@/lib/quillContext";
import {
  DAILY_MESSAGE_LIMIT,
  MONTHLY_TOKEN_LIMIT,
  dayKey,
  monthKey,
} from "@/lib/chatLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET /api/dashboard/insight[?refresh=1]
// Returns the user's "Insight of the day" for the dashboard Quill widget —
// a short, specific AI observation from their own trades/rules/goals.
// Generated once per LOCAL day and cached on the user doc; ?refresh=1
// forces a fresh one (counted against the same Quill fair-use budget).

// The user's local calendar day (yyyy-MM-dd) so the cache rolls over at the
// user's midnight, not UTC's.
function localDay(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const INSIGHT_PROMPT = `
You are QuillAI, the trading-journal assistant. Write ONE short "insight of
the day" for the trader's dashboard, drawn strictly from the snapshot below.

Rules:
- 1–2 sentences, under ~45 words. Plain text only — no markdown, no lists,
  no headings, no preamble like "Here's your insight".
- Be specific and grounded: cite a real number, symbol, strategy, streak,
  rule, or goal from the data. Never invent trades or stats.
- Surface the single MOST useful thing right now: a leak, a hot/cold streak,
  a strategy or symbol that's over/under-performing, a rule they broke, or
  progress toward a goal. Prefer something actionable.
- Encouraging but honest. If they're doing well, say what's working.
- This is journaling insight, NOT financial advice — no predictions or
  trade recommendations.
- If there aren't enough trades yet to say anything meaningful, give a brief
  friendly nudge to log more trades so you can spot patterns.
`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id)
    .select(
      "isPro chatDailyDate chatDailyCount chatMonth chatMonthTokens dashInsightDate dashInsightText dashInsightAt",
    )
    .lean<{
      isPro?: boolean;
      chatDailyDate?: string;
      chatDailyCount?: number;
      chatMonth?: string;
      chatMonthTokens?: number;
      dashInsightDate?: string;
      dashInsightText?: string;
      dashInsightAt?: Date;
    }>();
  if (!user?.isPro) {
    return NextResponse.json(
      { error: "Pro membership required" },
      { status: 403 },
    );
  }

  const tz = session.user.timezone || "America/New_York";
  const today = localDay(tz);
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  // Serve the cached insight unless it's stale or a refresh was requested.
  if (
    !refresh &&
    user.dashInsightDate === today &&
    user.dashInsightText
  ) {
    return NextResponse.json({
      insight: user.dashInsightText,
      generatedAt: user.dashInsightAt ?? null,
      cached: true,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fall back to any cached copy rather than erroring the widget.
    if (user.dashInsightText) {
      return NextResponse.json({
        insight: user.dashInsightText,
        generatedAt: user.dashInsightAt ?? null,
        cached: true,
      });
    }
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  // Share the Quill fair-use budget. If the user is tapped out, serve stale.
  const dKey = dayKey();
  const mKey = monthKey();
  const usedToday = user.chatDailyDate === dKey ? user.chatDailyCount ?? 0 : 0;
  const usedMonthTokens =
    user.chatMonth === mKey ? user.chatMonthTokens ?? 0 : 0;
  if (usedToday >= DAILY_MESSAGE_LIMIT || usedMonthTokens >= MONTHLY_TOKEN_LIMIT) {
    if (user.dashInsightText) {
      return NextResponse.json({
        insight: user.dashInsightText,
        generatedAt: user.dashInsightAt ?? null,
        cached: true,
      });
    }
    return NextResponse.json(
      { error: "AI usage limit reached — check back tomorrow." },
      { status: 429 },
    );
  }

  // Load the same context Quill chat uses.
  const userId = new mongoose.Types.ObjectId(session.user.id);
  const [trades, rulesBoard, strategies, goals] = await Promise.all([
    Trade.find({ userID: userId, simulated: false })
      .sort({ dateBought: -1 })
      .limit(1000)
      .lean() as unknown as Promise<LeanTrade[]>,
    RulesBoard.findOne({ userId }).lean() as Promise<LeanRulesBoard | null>,
    Strategy.find({ userId })
      .select("name direction timeframes description tags")
      .lean() as unknown as Promise<LeanStrategy[]>,
    Goal.find({ userId }).sort({ order: 1 }).lean() as unknown as Promise<
      LeanGoal[]
    >,
  ]);

  const context = [
    buildTradeContext(trades),
    buildRulesContext(rulesBoard),
    buildStrategiesContext(strategies),
    buildGoalsContext(goals, trades),
  ]
    .filter(Boolean)
    .join("\n\n");

  let insight = "";
  let tokens = 0;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `${INSIGHT_PROMPT}\n\nToday: ${today} (${tz}).`,
    });
    const result = await model.generateContent(
      `TRADER SNAPSHOT\n---\n${context}\n---\n\nWrite today's insight.`,
    );
    tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
    insight = result.response.text().trim();
  } catch (err) {
    if (user.dashInsightText) {
      return NextResponse.json({
        insight: user.dashInsightText,
        generatedAt: user.dashInsightAt ?? null,
        cached: true,
      });
    }
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!insight) {
    return NextResponse.json(
      { error: "Couldn't generate an insight right now." },
      { status: 502 },
    );
  }

  const now = new Date();
  try {
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        dashInsightDate: today,
        dashInsightText: insight,
        dashInsightAt: now,
        chatDailyDate: dKey,
        chatDailyCount: usedToday + 1,
        chatMonth: mKey,
        chatMonthTokens: usedMonthTokens + tokens,
      },
    });
  } catch {
    /* best-effort persistence — still return the fresh insight */
  }

  return NextResponse.json({ insight, generatedAt: now, cached: false });
}
