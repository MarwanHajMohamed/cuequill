import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Goal from "@/lib/models/Goal";
import { User } from "@/lib/models/User";
import {
  METRICS,
  TIMEFRAMES,
  RECURRENCES,
  taskPeriodKey,
  type GoalMetric,
  type TaskRecurrence,
} from "@/lib/goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function gate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, status: 401 };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false as const, status: 404 };
  }
  await connectDb();
  const u = await User.findById(session.user.id)
    .select("isPro")
    .lean<{ isPro?: boolean }>();
  if (!u?.isPro) return { ok: false as const, status: 403 };
  return {
    ok: true as const,
    userId: session.user.id,
    tz: session.user.timezone || "America/New_York",
  };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const g = await gate(id);
  if (!g.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: g.status });
  }

  const body = await req.json().catch(() => ({}));
  const set: Record<string, unknown> = {};
  if (typeof body.title === "string") set.title = body.title.trim();
  if (body.metric !== undefined && METRICS.includes(body.metric as GoalMetric)) {
    set.metric = body.metric;
  }
  if (body.target !== undefined && Number.isFinite(Number(body.target))) {
    set.target = Number(body.target);
  }
  if (body.timeframe !== undefined && TIMEFRAMES.includes(body.timeframe)) {
    set.timeframe = body.timeframe;
  }
  if (body.direction === "at_least" || body.direction === "at_most") {
    set.direction = body.direction;
  }
  if (RECURRENCES.includes(body.recurrence)) set.recurrence = body.recurrence;
  if (body.customDays !== undefined) {
    set.customDays = Math.max(1, Math.round(Number(body.customDays) || 1));
  }

  // Toggling done is stored as the completed-period key so recurring tasks
  // reset automatically. Needs the effective recurrence (a just-changed one
  // wins over the stored value).
  if (typeof body.done === "boolean") {
    set.done = body.done;
    const existing = await Goal.findOne({ _id: id, userId: g.userId })
      .select("recurrence customDays")
      .lean<{ recurrence?: TaskRecurrence; customDays?: number }>();
    const recurrence: TaskRecurrence =
      (set.recurrence as TaskRecurrence) ?? existing?.recurrence ?? "once";
    const customDays =
      (set.customDays as number) ?? existing?.customDays ?? 1;
    set.completedPeriod = body.done
      ? taskPeriodKey(recurrence, new Date(), g.tz, customDays)
      : "";
  }

  const updated = await Goal.findOneAndUpdate(
    { _id: id, userId: g.userId },
    { $set: set },
    { new: true },
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const g = await gate(id);
  if (!g.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: g.status });
  }
  await Goal.deleteOne({ _id: id, userId: g.userId });
  return NextResponse.json({ ok: true });
}
