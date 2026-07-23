// Shared catalogue of reports plus the scope maths, imported by both the
// /reports index and each /reports/[report] viewer so the two stay in
// sync. The heavy lifting (table/CSV/JSON building) lives in
// @/lib/reports; this module is just UI metadata + trade scoping.

import type { Trade } from "@/app/types/Trades";
import {
  allTradesTable,
  taxReportTable,
  monthlyPerformanceTable,
  strategyPerformanceTable,
  symbolPerformanceTable,
  backupJson,
  type ReportTable,
} from "@/lib/reports";

export type ReportSection = "data" | "analytics";

export type ReportDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
  section: ReportSection;
} & (
  | { kind: "table"; build: (trades: Trade[]) => ReportTable }
  | { kind: "json"; build: (trades: Trade[]) => string }
);

export const REPORTS: ReportDef[] = [
  {
    id: "all-trades",
    title: "All trades",
    description: "Every trade with all fields.",
    icon: "fa-solid fa-table-list",
    section: "data",
    kind: "table",
    build: allTradesTable,
  },
  {
    id: "backup",
    title: "Full backup",
    description: "Raw JSON of everything in scope.",
    icon: "fa-solid fa-database",
    section: "data",
    kind: "json",
    build: backupJson,
  },
  {
    id: "tax",
    title: "Tax report",
    description: "Proceeds, cost basis and gain/loss per closed position.",
    icon: "fa-solid fa-file-invoice-dollar",
    section: "analytics",
    kind: "table",
    build: taxReportTable,
  },
  {
    id: "monthly",
    title: "Monthly performance",
    description: "Win rate and net P/L by month.",
    icon: "fa-solid fa-calendar-check",
    section: "analytics",
    kind: "table",
    build: monthlyPerformanceTable,
  },
  {
    id: "strategy",
    title: "Strategy performance",
    description: "Expectancy, win rate and net P/L by strategy.",
    icon: "fa-solid fa-bezier-curve",
    section: "analytics",
    kind: "table",
    build: strategyPerformanceTable,
  },
  {
    id: "symbol",
    title: "Symbol performance",
    description: "Net P/L and win rate by underlying.",
    icon: "fa-solid fa-coins",
    section: "analytics",
    kind: "table",
    build: symbolPerformanceTable,
  },
];

export function getReport(id: string): ReportDef | undefined {
  return REPORTS.find((r) => r.id === id);
}

export const SECTION_LABEL: Record<ReportSection, string> = {
  data: "Data exports",
  analytics: "Performance & tax",
};

// ---- scope ---------------------------------------------------------------

export const RANGES = [
  { key: "all", label: "All time" },
  { key: "ytd", label: "This year" },
  { key: "12m", label: "Last 12 months" },
  { key: "custom", label: "Custom" },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export type Scope = {
  range: RangeKey;
  from: string;
  to: string;
  includeSim: boolean;
};

export const DEFAULT_SCOPE: Scope = {
  range: "all",
  from: "",
  to: "",
  includeSim: false,
};

// Resolve the active [from, to] day bounds for the chosen preset. The
// range filters on entry date (dateBought).
function bounds(scope: Scope): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (scope.range === "ytd") {
    return { from: new Date(now.getFullYear(), 0, 1), to: null };
  }
  if (scope.range === "12m") {
    const f = new Date(now);
    f.setFullYear(f.getFullYear() - 1);
    return { from: f, to: null };
  }
  if (scope.range === "custom") {
    return {
      from: scope.from ? new Date(scope.from + "T00:00:00") : null,
      to: scope.to ? new Date(scope.to + "T23:59:59") : null,
    };
  }
  return { from: null, to: null };
}

// Apply the scope (date range on entry date + simulated toggle) to a
// trade list.
export function scopeTrades(trades: Trade[], scope: Scope): Trade[] {
  const b = bounds(scope);
  return trades.filter((t) => {
    if (!scope.includeSim && t.simulated) return false;
    if (!b.from && !b.to) return true;
    const d = t.dateBought ? new Date(t.dateBought).getTime() : NaN;
    if (Number.isNaN(d)) return false;
    if (b.from && d < b.from.getTime()) return false;
    if (b.to && d > b.to.getTime()) return false;
    return true;
  });
}
