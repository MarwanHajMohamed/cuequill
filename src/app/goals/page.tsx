"use client";

import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import { motion } from "framer-motion";
import { useState } from "react";
import { useGoals, useGoalMutations, type Goal } from "@/hooks/useGoals";
import {
  METRICS,
  TIMEFRAMES,
  RECURRENCES,
  METRIC_LABEL,
  TIMEFRAME_LABEL,
  RECURRENCE_LABEL,
  metricUnit,
  type GoalMetric,
  type GoalTimeframe,
  type GoalDirection,
  type TaskRecurrence,
} from "@/lib/goals";
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

function metricGoalHeading(g: Goal): string {
  if (g.title) return g.title;
  if (!g.metric || g.target == null) return "Goal";
  const op = g.direction === "at_most" ? "≤" : "≥";
  return `${METRIC_LABEL[g.metric]} ${op} ${formatValue(g.metric, g.target)}`;
}

// ── Add goal ─────────────────────────────────────────────────────────
function AddGoal({ onDone }: { onDone: () => void }) {
  const { create } = useGoalMutations();
  const [kind, setKind] = useState<"metric" | "manual">("metric");
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<GoalMetric>("net_pl");
  const [direction, setDirection] = useState<GoalDirection>("at_least");
  const [target, setTarget] = useState("");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>("month");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("once");
  const [customDays, setCustomDays] = useState("3");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      if (kind === "manual") {
        if (!title.trim()) return setError("Give your task a name.");
        await create.mutateAsync({
          kind: "manual",
          title: title.trim(),
          recurrence,
          ...(recurrence === "custom"
            ? { customDays: Math.max(1, Number(customDays) || 1) }
            : {}),
        });
      } else {
        const t = Number(target);
        if (!Number.isFinite(t)) return setError("Enter a target number.");
        await create.mutateAsync({
          kind: "metric",
          metric,
          direction,
          target: t,
          timeframe,
          title: title.trim() || undefined,
        });
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add goal.");
    }
  };

  const inputCls =
    "w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 flex flex-col gap-3">
      {/* Kind toggle */}
      <div className="inline-flex self-start rounded-full border border-white/10 p-1 gap-1 text-[12px]">
        {(["metric", "manual"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-1 rounded-full transition cursor-pointer ${
              kind === k
                ? "bg-white/[0.08] text-white"
                : "text-white/55 hover:text-white"
            }`}
          >
            {k === "metric" ? "Target" : "Task"}
          </button>
        ))}
      </div>

      {kind === "metric" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <label className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <span className="text-[10.5px] tracking-wide text-white/40">
              Metric
            </span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as GoalMetric)}
              className={`${inputCls} cursor-pointer`}
            >
              {METRICS.map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-wide text-white/40">
              Direction
            </span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as GoalDirection)}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="at_least">At least</option>
              <option value="at_most">At most</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-wide text-white/40">
              Target
            </span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="decimal"
              placeholder={metricUnit(metric) === "percent" ? "60" : "2000"}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-wide text-white/40">
              Timeframe
            </span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as GoalTimeframe)}
              className={`${inputCls} cursor-pointer`}
            >
              {TIMEFRAMES.map((t) => (
                <option key={t} value={t}>
                  {TIMEFRAME_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional name (e.g. “Green month”)"
            className={`${inputCls} col-span-2 md:col-span-4`}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Journal every trade the same day"
            className={inputCls}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <div className="flex items-end gap-2 flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] tracking-wide text-white/40">
                Repeat
              </span>
              <select
                value={recurrence}
                onChange={(e) =>
                  setRecurrence(e.target.value as TaskRecurrence)
                }
                className={`${inputCls} cursor-pointer w-auto`}
              >
                {RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {RECURRENCE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            {recurrence === "custom" && (
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] tracking-wide text-white/40">
                  Every N days
                </span>
                <input
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  inputMode="numeric"
                  className={`${inputCls} w-24`}
                />
              </label>
            )}
            <span className="text-[11px] text-white/40 pb-2">
              {recurrence === "once"
                ? "Check off once."
                : "Resets each period so you can tick it again."}
            </span>
          </div>
        </div>
      )}

      {error && <div className="text-[12px] text-red-300">{error}</div>}

      <div className="flex items-center gap-2 self-end">
        <button
          onClick={onDone}
          className="px-3.5 py-1.5 rounded-full border border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white transition text-[12.5px] cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={create.isPending}
          className="px-4 py-1.5 rounded-full border border-teal-400/40 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25 transition text-[12.5px] font-medium cursor-pointer disabled:opacity-60"
        >
          {create.isPending ? "Adding…" : "Add goal"}
        </button>
      </div>
    </div>
  );
}

// ── Metric goal card ─────────────────────────────────────────────────
function MetricGoalCard({ g }: { g: Goal }) {
  const { remove } = useGoalMutations();
  const pct = Math.round(g.progress * 100);
  const barTone = g.over
    ? "bg-red-400"
    : g.achieved
      ? "bg-teal-400"
      : "bg-teal-500/70";

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-medium truncate flex items-center gap-2">
            {metricGoalHeading(g)}
            {g.achieved && !g.over && (
              <span className="text-[9.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
                Achieved
              </span>
            )}
            {g.over && (
              <span className="text-[9.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-200 border border-red-400/30">
                Over
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-white/45 mt-0.5">
            {g.timeframe ? TIMEFRAME_LABEL[g.timeframe] : ""}
          </div>
        </div>
        <button
          onClick={() => remove.mutate(g.id)}
          aria-label="Delete goal"
          className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-white/30 hover:text-red-300 hover:bg-red-500/10 transition md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
        >
          <i className="fa-regular fa-trash-can text-[12px]" />
        </button>
      </div>

      <div>
        <div className="flex items-baseline justify-between text-[12.5px] mb-1.5">
          <span className="text-white/70 tabular-nums">
            {g.metric && g.current != null
              ? formatValue(g.metric, g.current)
              : "—"}
            <span className="text-white/35">
              {" "}
              / {g.metric && g.target != null ? formatValue(g.metric, g.target) : "—"}
            </span>
          </span>
          <span className="text-white/45 tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${barTone} transition-all`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Manual goal row ──────────────────────────────────────────────────
function ManualGoalRow({ g }: { g: Goal }) {
  const { update, remove } = useGoalMutations();
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5">
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
        className={`flex-1 text-[13.5px] ${
          g.done ? "text-white/40 line-through" : "text-white/85"
        }`}
      >
        {g.title}
      </span>
      {g.recurrence && g.recurrence !== "once" && (
        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] tracking-wide text-teal-200/80 bg-teal-500/10 border border-teal-400/25 rounded-full px-2 py-0.5">
          <i className="fa-solid fa-rotate text-[8px]" />
          {g.recurrence === "custom" && g.customDays
            ? `Every ${g.customDays}d`
            : RECURRENCE_LABEL[g.recurrence]}
        </span>
      )}
      <button
        onClick={() => remove.mutate(g.id)}
        aria-label="Delete task"
        className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-white/30 hover:text-red-300 hover:bg-red-500/10 transition md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
      >
        <i className="fa-regular fa-trash-can text-[12px]" />
      </button>
    </div>
  );
}

function Page() {
  const { data: goals = [], isLoading } = useGoals();
  const [adding, setAdding] = useState(false);

  const metricGoals = goals.filter((g) => g.kind === "metric");
  const manualGoals = goals.filter((g) => g.kind === "manual");

  return (
    <div className="w-full flex flex-col md:items-start min-h-screen pb-16">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1000px] mt-28 md:mt-10 px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-[26px] md:text-[32px] font-medium tracking-tight">
              Goals
            </h1>
            <p className="text-[13px] text-white/55 mt-1">
              Set targets tracked against your trades, and a checklist for the
              habits behind them.
            </p>
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-400/40 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25 transition text-[13px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[11px]" />
              New goal
            </button>
          )}
        </motion.div>

        {adding && (
          <div className="mt-5">
            <AddGoal onDone={() => setAdding(false)} />
          </div>
        )}

        {isLoading ? (
          <div className="mt-10 text-center text-[13px] text-white/40">
            Loading…
          </div>
        ) : goals.length === 0 && !adding ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] py-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-300 flex items-center justify-center">
              <i className="fa-solid fa-bullseye text-[16px]" />
            </div>
            <p className="mt-3 text-[13px] text-white/55">
              No goals yet. Set a target like “Net P/L ≥ $2,000 this month” or a
              habit to tick off.
            </p>
          </div>
        ) : (
          <>
            {/* Targets */}
            {metricGoals.length > 0 && (
              <section className="mt-8">
                <h2 className="text-[11px] tracking-[0.1em] text-white/40 font-medium mb-3">
                  Targets
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {metricGoals.map((g) => (
                    <MetricGoalCard key={g.id} g={g} />
                  ))}
                </div>
              </section>
            )}

            {/* Tasks */}
            {manualGoals.length > 0 && (
              <section className="mt-8">
                <h2 className="text-[11px] tracking-[0.1em] text-white/40 font-medium mb-3">
                  Tasks
                </h2>
                <div className="flex flex-col gap-2">
                  {manualGoals.map((g) => (
                    <ManualGoalRow key={g.id} g={g} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GatedPage() {
  return (
    <ProGate
      feature="Goals"
      description="Set trading targets tracked against your journal, plus a habit checklist. Available on Pro."
      className="min-h-screen"
    >
      <Page />
    </ProGate>
  );
}

export default withAuth(GatedPage);
