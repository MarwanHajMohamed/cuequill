import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Goal from "@/lib/models/Goal";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import {
  METRICS,
  TIMEFRAMES,
  computeMetric,
  goalProgress,
  type GoalMetric,
  type GoalTimeframe,
  type MetricTrade,
} from "@/lib/goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pro gate (Goals is a Pro feature, like the rules board). Reads the live
// DB flag so upgrades/downgrades take effect immediately.
async function gate() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  await connectDb();
  const u = await User.findById(session.user.id)
    .select("isPro")
    .lean<{ isPro?: boolean }>();
  if (!u?.isPro) {
    return { ok: false as const, status: 403, error: "Pro membership required" };
  }
  return { ok: true as const, userId: session.user.id };
}

type GoalLean = {
  _id: mongoose.Types.ObjectId;
  kind: "metric" | "manual";
  title: string;
  metric?: GoalMetric;
  target?: number;
  timeframe?: GoalTimeframe;
  direction?: "at_least" | "at_most";
  done?: boolean;
  order: number;
  createdAt: Date;
};

export async function GET() {
  const g = await gate();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const goals = await Goal.find({ userId: g.userId })
    .sort({ order: 1, createdAt: 1 })
    .lean<GoalLean[]>();

  // Load real (non-simulated) trades once to evaluate every metric goal.
  const trades = (await Trade.find({
    userID: new mongoose.Types.ObjectId(g.userId),
    simulated: false,
  })
    .select("status profitLoss fees dateBought dateClosed")
    .lean()) as unknown as MetricTrade[];

  const now = new Date();

  const enriched = goals.map((goal) => {
    const base = {
      id: goal._id.toString(),
      kind: goal.kind,
      title: goal.title,
      metric: goal.metric ?? null,
      target: goal.target ?? null,
      timeframe: goal.timeframe ?? null,
      direction: goal.direction ?? "at_least",
      done: !!goal.done,
      createdAt: goal.createdAt,
    };
    if (goal.kind !== "metric" || !goal.metric || goal.target == null) {
      return { ...base, current: null, progress: 0, achieved: false, over: false };
    }
    const current = computeMetric(
      goal.metric,
      trades,
      goal.timeframe ?? "month",
      now,
    );
    const { progress, achieved, over } = goalProgress(
      current,
      goal.target,
      goal.direction ?? "at_least",
    );
    return { ...base, current, progress, achieved, over };
  });

  return NextResponse.json({ goals: enriched });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "metric" ? "metric" : "manual";
  const title = String(body.title ?? "").trim();

  if (kind === "manual") {
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
  } else {
    const metric = body.metric as GoalMetric;
    if (!METRICS.includes(metric)) {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }
    const target = Number(body.target);
    if (!Number.isFinite(target)) {
      return NextResponse.json({ error: "Target is required" }, { status: 400 });
    }
  }

  const count = await Goal.countDocuments({ userId: g.userId });
  const created = await Goal.create({
    userId: new mongoose.Types.ObjectId(g.userId),
    kind,
    title,
    order: count,
    ...(kind === "metric"
      ? {
          metric: body.metric as GoalMetric,
          target: Number(body.target),
          timeframe: (TIMEFRAMES.includes(body.timeframe)
            ? body.timeframe
            : "month") as GoalTimeframe,
          direction: body.direction === "at_most" ? "at_most" : "at_least",
        }
      : {}),
  });

  return NextResponse.json({ id: String(created._id) }, { status: 201 });
}
