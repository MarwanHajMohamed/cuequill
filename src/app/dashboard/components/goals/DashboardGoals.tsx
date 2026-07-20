"use client";

import Link from "next/link";
import { useGoals, useGoalMutations, type Goal } from "@/hooks/useGoals";
import {
  METRIC_LABEL,
  metricUnit,
  RECURRENCE_LABEL,
  type GoalMetric,
} from "@/lib/goals";
import { fmtMoneyCompact } from "@/lib/helpers/fmt";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CARD_CLASS } from "../DashboardCard";

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
    <div className="px-4 md:px-5 py-2.5">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[13px] font-medium truncate">{heading(g)}</span>
        <span className="text-[11.5px] text-white/55 tabular-nums shrink-0">
          {g.metric && g.current != null
            ? formatValue(g.metric, g.current)
            : "—"}
          <span className="text-white/30">
            {" / "}
            {g.metric && g.target != null
              ? formatValue(g.metric, g.target)
              : "—"}
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

// A task row — checkable inline straight from the dashboard.
function TaskRow({ g }: { g: Goal }) {
  const { update } = useGoalMutations();
  return (
    <div className="flex items-center gap-2.5 px-4 md:px-5 py-2">
      <button
        onClick={() => update.mutate({ id: g.id, done: !g.done })}
        aria-label={g.done ? "Mark not done" : "Mark done"}
        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
          g.done
            ? "bg-teal-500/25 border-teal-400/50 text-teal-200"
            : "border-white/20 text-transparent hover:border-white/40"
        }`}
      >
        <i className="fa-solid fa-check text-[10px]" />
      </button>
      <span
        className={`flex-1 text-[13px] truncate ${
          g.done ? "text-white/40 line-through" : "text-white/85"
        }`}
      >
        {g.title}
      </span>
      {g.recurrence && g.recurrence !== "once" && (
        <span className="shrink-0 text-[9.5px] tracking-wide text-teal-200/70">
          {g.recurrence === "custom" && g.customDays
            ? `${g.customDays}d`
            : RECURRENCE_LABEL[g.recurrence]}
        </span>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 md:px-5 pt-2.5 pb-1 text-[10px] tracking-[0.1em] text-white/35 font-medium">
      {label}
    </div>
  );
}

// Goals + tasks for the dashboard. Both sections show; a swap control flips
// which one sits on top (persisted). Tasks can be ticked off inline. Hidden
// entirely for non-Pro users (the goals API 403s → the query errors).
export default function DashboardGoals() {
  const { data: goals, isError } = useGoals();
  const [tasksFirst, setTasksFirst] = useLocalStorage<boolean>(
    "cuequill:goalsWidgetTasksFirst",
    false,
  );

  if (isError || !goals) return null;

  const metricGoals = goals.filter((g) => g.kind === "metric");
  const tasks = goals.filter((g) => g.kind === "manual");
  const doneCount = tasks.filter((g) => g.done).length;

  const targetsSection =
    metricGoals.length > 0 ? (
      <div key="targets">
        <SectionHeader label="Targets" />
        <ul className="divide-y divide-white/[0.06]">
          {metricGoals.slice(0, 5).map((g) => (
            <li key={g.id}>
              <MetricRow g={g} />
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const tasksSection =
    tasks.length > 0 ? (
      <div key="tasks">
        <SectionHeader label={`Tasks · ${doneCount}/${tasks.length}`} />
        <ul className="divide-y divide-white/[0.06]">
          {tasks.slice(0, 8).map((g) => (
            <li key={g.id}>
              <TaskRow g={g} />
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const sections = tasksFirst
    ? [tasksSection, targetsSection]
    : [targetsSection, tasksSection];
  const hasContent = metricGoals.length > 0 || tasks.length > 0;

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="md:text-base text-sm font-semibold">Goals &amp; tasks</h2>
        <div className="flex items-center gap-1.5">
          {metricGoals.length > 0 && tasks.length > 0 && (
            <button
              onClick={() => setTasksFirst((v) => !v)}
              title={tasksFirst ? "Show targets first" : "Show tasks first"}
              aria-label="Swap section order"
              className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white transition cursor-pointer"
            >
              <i className="fa-solid fa-arrow-down-up-across-line text-[10px]" />
            </button>
          )}
          <Link
            href="/goals"
            className="text-[11px] md:text-[12px] text-white/50 hover:text-white transition inline-flex items-center gap-1.5"
          >
            Manage
            <i className="fa-solid fa-chevron-right text-[9px]" />
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 -mx-4 md:-mx-5 border-t border-white/[0.06]">
        {hasContent ? (
          <div className="divide-y divide-white/[0.06]">{sections}</div>
        ) : (
          <div className="px-5 py-8 text-[12.5px] text-white/45 text-center">
            No goals or tasks yet — add them on the Goals page.
          </div>
        )}
      </div>
    </section>
  );
}
