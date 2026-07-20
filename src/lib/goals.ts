import {
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

// Shared goal types + pure metric computation. Lives in lib (no Mongoose)
// so both the client and the API can import the types and the maths.

export type GoalKind = "metric" | "manual";

// A "manual" goal is a checkable task with a recurrence. "once" is a plain
// one-time checklist item; the others reset each period (a daily task ticks
// off for today and comes back tomorrow, etc.). "custom" repeats every
// `customDays` days.
export type TaskRecurrence =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

export const RECURRENCES: TaskRecurrence[] = [
  "once",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];

export const RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
  once: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

// Local calendar date (yyyy-mm-dd) in the given timezone.
function localYmd(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// A key identifying the current period for a recurrence. A task is "done"
// when its stored completedPeriod equals this key; when the period rolls
// over the key changes and the task resets automatically — no cron needed.
export function taskPeriodKey(
  rec: TaskRecurrence,
  now: Date = new Date(),
  tz = "UTC",
  customDays = 1,
): string {
  const ymd = localYmd(now, tz);
  switch (rec) {
    case "once":
      return "once";
    case "daily":
      return ymd;
    case "monthly":
      return ymd.slice(0, 7); // yyyy-mm
    case "yearly":
      return ymd.slice(0, 4); // yyyy
    case "weekly": {
      // Monday of the local week, as yyyy-mm-dd.
      const d = new Date(ymd + "T00:00:00Z");
      const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
      d.setUTCDate(d.getUTCDate() - dow);
      return `w:${d.toISOString().slice(0, 10)}`;
    }
    case "custom": {
      const n = Math.max(1, Math.round(customDays || 1));
      const epochDay = Math.floor(
        new Date(ymd + "T00:00:00Z").getTime() / 86_400_000,
      );
      return `c:${n}:${Math.floor(epochDay / n)}`;
    }
  }
}
export type GoalMetric =
  | "net_pl"
  | "win_rate"
  | "trade_count"
  | "profit_factor"
  | "avg_win";
export type GoalTimeframe = "week" | "month" | "quarter" | "year" | "all";
export type GoalDirection = "at_least" | "at_most";

export const METRICS: GoalMetric[] = [
  "net_pl",
  "win_rate",
  "trade_count",
  "profit_factor",
  "avg_win",
];
export const TIMEFRAMES: GoalTimeframe[] = [
  "week",
  "month",
  "quarter",
  "year",
  "all",
];

export const METRIC_LABEL: Record<GoalMetric, string> = {
  net_pl: "Net P/L",
  win_rate: "Win rate",
  trade_count: "Number of trades",
  profit_factor: "Profit factor",
  avg_win: "Average win",
};

export const TIMEFRAME_LABEL: Record<GoalTimeframe, string> = {
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  all: "All time",
};

// How to format a metric's value in the UI.
export type MetricUnit = "currency" | "percent" | "count" | "ratio";
export function metricUnit(m: GoalMetric): MetricUnit {
  switch (m) {
    case "net_pl":
    case "avg_win":
      return "currency";
    case "win_rate":
      return "percent";
    case "trade_count":
      return "count";
    case "profit_factor":
      return "ratio";
  }
}

// Minimal trade shape the metric maths needs.
export type MetricTrade = {
  status: "WIN" | "LOSS" | "OPEN";
  profitLoss?: number | null;
  fees?: number | null;
  dateBought: string;
  dateClosed?: string | null;
};

// Start of the current period for a timeframe. `all` returns null (no
// lower bound). Week starts Monday to match the trading week.
export function timeframeStart(tf: GoalTimeframe, now: Date): Date | null {
  switch (tf) {
    case "week":
      return startOfWeek(now, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(now);
    case "quarter":
      return startOfQuarter(now);
    case "year":
      return startOfYear(now);
    case "all":
      return null;
  }
}

function inWindow(dateStr: string | null | undefined, start: Date | null): boolean {
  if (!start) return true;
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return !Number.isNaN(t) && t >= start.getTime();
}

// Current value of a metric over the trades in the timeframe window.
// Returns null when it can't be computed (no qualifying trades / no
// losses for profit factor), so the UI can show "—" rather than a
// misleading 0.
export function computeMetric(
  metric: GoalMetric,
  trades: MetricTrade[],
  tf: GoalTimeframe,
  now: Date = new Date(),
): number | null {
  const start = timeframeStart(tf, now);

  // Closed trades attribute to their exit date; entries to dateBought.
  const closed = trades.filter(
    (t) =>
      (t.status === "WIN" || t.status === "LOSS") &&
      inWindow(t.dateClosed ?? t.dateBought, start),
  );

  switch (metric) {
    case "net_pl":
      return closed.reduce((s, t) => s + tradeNetPL(t), 0);

    case "win_rate": {
      if (closed.length === 0) return null;
      const wins = closed.filter((t) => t.status === "WIN").length;
      return (wins / closed.length) * 100;
    }

    case "trade_count":
      // Count trades entered in the window (targets like "take 20 trades"
      // or caps like "no more than N").
      return trades.filter((t) => inWindow(t.dateBought, start)).length;

    case "profit_factor": {
      const gross = closed.reduce(
        (acc, t) => {
          const pl = tradeNetPL(t);
          if (pl >= 0) acc.win += pl;
          else acc.loss += Math.abs(pl);
          return acc;
        },
        { win: 0, loss: 0 },
      );
      if (gross.loss === 0) return null; // undefined without any losses
      return gross.win / gross.loss;
    }

    case "avg_win": {
      const wins = closed.filter((t) => tradeNetPL(t) > 0);
      if (wins.length === 0) return null;
      return wins.reduce((s, t) => s + tradeNetPL(t), 0) / wins.length;
    }
  }
}

// Progress of a metric goal toward its target.
export function goalProgress(
  current: number | null,
  target: number,
  direction: GoalDirection,
): { progress: number; achieved: boolean; over: boolean } {
  if (current == null || !Number.isFinite(target) || target === 0) {
    return { progress: 0, achieved: false, over: false };
  }
  const frac = current / target;
  const clamped = Math.max(0, Math.min(1, frac));
  if (direction === "at_least") {
    return { progress: clamped, achieved: current >= target, over: false };
  }
  // at_most (a cap): "achieved" means staying under; over the cap is bad.
  return { progress: clamped, achieved: current <= target, over: current > target };
}
