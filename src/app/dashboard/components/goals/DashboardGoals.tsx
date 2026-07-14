"use client";

import Link from "next/link";
import { useGoals, type Goal } from "@/hooks/useGoals";
import { METRIC_LABEL, metricUnit, type GoalMetric } from "@/lib/goals";
import { fmtMoneyCompact } from "@/lib/helpers/fmt";

function formatValue(metric: GoalMetric, value: number): string {
  switch (metricUnit(metric)) {
    case "currency":
      return fmtMoneyCompact(value);
    case "percent":
      return `${value.toFixed(0)}%`;
    case "count":
      return `${Math.round(value)}`;
    case "ratio":
      return value.toFixed(2);
  }
}

function heading(g: Goal): string {
  if (g.title) return g.title;
  if (!g.metric || g.target == null) return "Goal";
  const op = g.direction === "at_most" ? "≤" : "≥";
  return `${METRIC_LABEL[g.metric]} ${op} ${formatValue(g.metric, g.target)}`;
}

function MetricRow({ g }: { g: Goal }) {
  const pct = Math.round(g.progress * 100);
  const tone = g.over
    ? "bg-red-400"
    : g.achieved
      ? "bg-teal-400"
      : "bg-teal-500/70";
  return (
    <div className="px-4 md:px-5 py-3">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[13px] font-medium truncate">{heading(g)}</span>
        <span className="text-[11.5px] text-white/55 tabular-nums shrink-0">
          {g.metric && g.current != null ? formatValue(g.metric, g.current) : "—"}
          <span className="text-white/30">
            {" / "}
            {g.metric && g.target != null ? formatValue(g.metric, g.target) : "—"}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${tone} transition-all`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// Compact goal-progress card for the dashboard. Hidden entirely when the
// user has no goals (or isn't Pro — the goals API 403s and the query errors).
export default function DashboardGoals() {
  const { data: goals, isError } = useGoals();

  if (isError || !goals || goals.length === 0) return null;

  const metricGoals = goals.filter((g) => g.kind === "metric");
  const manualGoals = goals.filter((g) => g.kind === "manual");
  const doneCount = manualGoals.filter((g) => g.done).length;

  const shownMetrics = metricGoals.slice(0, 4);
  const moreMetrics = metricGoals.length - shownMetrics.length;

  return (
    <div className="w-full max-w-[1100px] mx-auto md:mx-0 px-5 md:px-10 flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="md:text-xl text-sm font-bold">Goals</h2>
        <Link
          href="/goals"
          className="text-[11px] md:text-[12px] text-white/50 hover:text-white transition inline-flex items-center gap-1.5"
        >
          Manage goals
          <i className="fa-solid fa-chevron-right text-[9px]" />
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden">
        {shownMetrics.length > 0 ? (
          <ul className="divide-y divide-white/[0.06]">
            {shownMetrics.map((g) => (
              <li key={g.id}>
                <MetricRow g={g} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-4 text-[12.5px] text-white/45">
            No targets set yet.
          </div>
        )}

        {(manualGoals.length > 0 || moreMetrics > 0) && (
          <div className="px-4 md:px-5 py-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11.5px] text-white/45">
            <span>
              {manualGoals.length > 0
                ? `Checklist: ${doneCount} of ${manualGoals.length} done`
                : ""}
            </span>
            {moreMetrics > 0 && (
              <Link href="/goals" className="hover:text-white transition">
                +{moreMetrics} more
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
