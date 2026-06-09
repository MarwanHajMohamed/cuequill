"use client";

import Bar from "@/app/dashboard/components/charts/Bar";
import Pie from "@/app/dashboard/components/charts/Pie";
import { TAG_KIND_BY_LABEL } from "@/app/data/tradeTags";
import { Trade } from "@/app/types/Trades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import EquityCurve from "./EquityCurve";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { motion, AnimatePresence } from "framer-motion";

type StatsVisibility = {
  netPL: boolean;
  profitFactor: boolean;
  winRate: boolean;
  avgRR: boolean;
  winStreak: boolean;
  equityCurve: boolean;
  tagStats: boolean;
  filteredStats: boolean;
  totalStats: boolean;
  monthlyStats: boolean;
};

const DEFAULT_VISIBILITY: StatsVisibility = {
  netPL: true,
  profitFactor: true,
  winRate: true,
  avgRR: true,
  winStreak: true,
  equityCurve: true,
  tagStats: true,
  filteredStats: true,
  totalStats: true,
  monthlyStats: true,
};

const TILE_OPTIONS: Array<{ key: keyof StatsVisibility; label: string }> = [
  { key: "netPL", label: "Net P&L" },
  { key: "profitFactor", label: "Profit Factor" },
  { key: "winRate", label: "Win Rate" },
  { key: "avgRR", label: "Avg R:R" },
  { key: "winStreak", label: "Best Win Streak" },
];

const SECTION_OPTIONS: Array<{ key: keyof StatsVisibility; label: string }> = [
  { key: "equityCurve", label: "Equity Curve" },
  { key: "tagStats", label: "Performance by Tag" },
  { key: "filteredStats", label: "Filter Insights" },
  { key: "totalStats", label: "Performance Breakdown" },
  { key: "monthlyStats", label: "Monthly Stats" },
];

const CustomizeMenu = ({
  visibility,
  setVisibility,
}: {
  visibility: StatsVisibility;
  setVisibility: (v: StatsVisibility) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (key: keyof StatsVisibility) => {
    setVisibility({ ...visibility, [key]: !visibility[key] });
  };

  const renderRow = ({
    key,
    label,
  }: {
    key: keyof StatsVisibility;
    label: string;
  }) => (
    <label
      key={key}
      className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer text-xs"
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={visibility[key]}
        onChange={() => toggle(key)}
        className="cursor-pointer accent-green-500"
      />
    </label>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:border-white/30 transition flex items-center gap-2 cursor-pointer"
      >
        <i className="fa-solid fa-sliders text-[11px]" />
        Customize
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-[#16151B] border border-white/10 rounded-md shadow-lg z-30 w-56 p-2">
          <div className="text-[10px] uppercase tracking-wide text-white/40 px-2 pt-1 pb-1">
            Summary tiles
          </div>
          {TILE_OPTIONS.map(renderRow)}
          <div className="text-[10px] uppercase tracking-wide text-white/40 px-2 pt-3 pb-1">
            Sections
          </div>
          {SECTION_OPTIONS.map(renderRow)}
        </div>
      )}
    </div>
  );
};

const MiniDonut = ({
  greenPct,
  size = 40,
}: {
  greenPct: number;
  size?: number;
}) => {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, greenPct));
  const dash = (safe / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)" }}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#dc2626"
        strokeWidth="5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#16a34a"
        strokeWidth="5"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="butt"
      />
    </svg>
  );
};

const InfoTooltip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    placed: boolean;
  }>({ left: 0, top: 0, placed: false });
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const visible = open || hovered;

  // Close on outside click (mobile/tap mode).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Position with `position: fixed` against the viewport so the tooltip
  // can never push the page width - even when the anchor icon is at the
  // right edge of the screen. Clamps left to keep at least 8px between
  // the tooltip and each viewport edge.
  useLayoutEffect(() => {
    if (!visible) {
      setCoords((c) => (c.placed ? { left: 0, top: 0, placed: false } : c));
      return;
    }
    const update = () => {
      const iconNode = ref.current;
      const tipNode = tipRef.current;
      if (!iconNode || !tipNode) return;
      const iconRect = iconNode.getBoundingClientRect();
      const tipRect = tipNode.getBoundingClientRect();
      const margin = 8;
      // Use clientWidth so the scrollbar isn't counted; falls back to
      // window.innerWidth on older browsers.
      const viewportW =
        document.documentElement.clientWidth || window.innerWidth;

      // Default: center the tooltip on the icon, then clamp into viewport.
      let left =
        iconRect.left + iconRect.width / 2 - tipRect.width / 2;
      if (left < margin) left = margin;
      const maxLeft = viewportW - margin - tipRect.width;
      if (left > maxLeft) left = maxLeft;

      // Place above the icon with an 8px gap.
      const top = iconRect.top - tipRect.height - 8;

      setCoords({ left, top, placed: true });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible]);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="cursor-pointer p-1.5 -m-1.5 leading-none"
        aria-label="More info"
      >
        <i className="fa-solid fa-circle-info text-sm md:text-xs text-white/40 hover:text-white/70 transition-colors" />
      </button>
      {/* Always rendered so we can measure it; visibility is gated on
          `coords.placed` so the user never sees a frame at (0, 0). */}
      <span
        ref={tipRef}
        style={{
          position: "fixed",
          left: coords.left,
          top: coords.top,
          maxWidth: "min(12rem, calc(100vw - 16px))",
          visibility: visible && coords.placed ? "visible" : "hidden",
          pointerEvents: "none",
        }}
        className="bg-[#16151B] border border-white/10 text-white/80 text-[11px] rounded-md px-2 py-1.5
                   whitespace-normal w-48 z-50 leading-snug shadow-md normal-case"
      >
        {text}
      </span>
    </span>
  );
};

const SummaryTile = ({
  label,
  info,
  className = "",
  children,
}: {
  label: string;
  info?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={`border border-[#282828] rounded-lg p-2 md:p-4 flex flex-col gap-1 md:gap-2 min-w-0 ${className}`}
  >
    <div className="text-[10px] md:text-xs text-white/50 flex items-center justify-between gap-1.5">
      <span className="truncate">{label}</span>
      {info && <InfoTooltip text={info} />}
    </div>
    <div className="flex items-center justify-between gap-2">{children}</div>
  </div>
);

// ─── Small display primitives for the breakdown sections ──────────────
function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function VerdictPill({
  tone,
  label,
}: {
  tone: "good" | "bad" | "neutral";
  label: string;
}) {
  const styles =
    tone === "good"
      ? "bg-green-500/20 text-green-500 border-green-500"
      : tone === "bad"
      ? "bg-red-500/20 text-red-500 border-red-500"
      : "bg-white/5 text-white/60 border-white/10";
  const icon =
    tone === "good" ? "✓" : tone === "bad" ? "✗" : "≈";
  return (
    <span
      className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${styles}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
}

function CompareCard({
  label,
  value,
  baseline,
  delta,
  deltaUnit,
  higherIsBetter,
  info,
}: {
  label: string;
  value: string;
  baseline: string;
  delta: number;
  deltaUnit: string;
  higherIsBetter: boolean;
  info?: string;
}) {
  const isPositiveDirection = delta > 0;
  const isNegativeDirection = delta < 0;
  const noDelta = Math.abs(delta) < 0.005;
  const isGood = higherIsBetter ? isPositiveDirection : isNegativeDirection;
  const isBad = higherIsBetter ? isNegativeDirection : isPositiveDirection;
  const tone = noDelta
    ? "text-white/40"
    : isGood
    ? "text-green-500"
    : isBad
    ? "text-red-500"
    : "text-white/40";
  const arrow = noDelta ? "·" : delta > 0 ? "↑" : "↓";
  const formatted = (() => {
    const a = Math.abs(delta);
    if (deltaUnit === "$") return `$${a.toFixed(2)}`;
    if (deltaUnit === "pp") return `${a.toFixed(1)} pp`;
    return a.toFixed(2);
  })();

  return (
    <div className="border border-[#282828] rounded-lg p-2 md:p-4 flex flex-col gap-1 md:gap-2 min-w-0 basis-[100px] md:basis-[200px] grow md:max-w-[280px]">
      <div className="flex items-center justify-between gap-1 text-[10px] md:text-xs text-white/50 uppercase tracking-wide">
        <span className="truncate">{label}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="text-sm md:text-xl font-semibold text-white truncate">
        {value}
      </div>
      <div className={`text-[10px] md:text-[11px] ${tone}`}>
        {arrow} {formatted}
      </div>
      <div className="text-[10px] text-white/30">vs {baseline}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  info,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
  info?: string;
}) {
  const valueColor =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
      ? "text-red-500"
      : "text-white";
  return (
    <div className="border border-[#282828] rounded-lg p-2 md:p-4 flex flex-col gap-1 md:gap-2 min-w-0">
      <div className="flex items-center justify-between gap-1 text-[10px] md:text-xs text-white/50 uppercase tracking-wide">
        <span className="truncate">{label}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <div className={`text-sm md:text-xl font-semibold truncate ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}

type BreakdownRow = {
  label: string;
  n: number;
  winRate: number;
  netPL: number;
  expectancy: number;
};

function BreakdownTable({
  title,
  rows,
  info,
}: {
  title: string;
  rows: BreakdownRow[];
  info?: string;
}) {
  // Largest absolute net P/L for the inline bar widths.
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.netPL)), 1);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-xs text-white/60 uppercase tracking-wide">
        <span>{title}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="border border-[#282828] rounded-lg overflow-x-auto md:overflow-hidden">
        <table className="w-full min-w-[480px] md:min-w-0 text-xs md:text-sm">
          <thead>
            <tr className="text-white/40 bg-white/3">
              <th className="text-left font-normal py-2 px-3">Label</th>
              <th className="text-right font-normal py-2 px-3">N</th>
              <th className="text-right font-normal py-2 px-3">Win %</th>
              <th className="text-right font-normal py-2 px-3">Net</th>
              <th className="text-right font-normal py-2 px-3">Avg</th>
              <th className="w-1/4 text-left font-normal py-2 px-3 hidden md:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isProfit = r.netPL >= 0;
              const widthPct = (Math.abs(r.netPL) / maxAbs) * 100;
              return (
                <tr key={r.label} className="border-t border-[#282828]">
                  <td className="py-2 px-3 truncate max-w-[180px]">
                    {r.label}
                  </td>
                  <td className="py-2 px-3 text-right text-white/60">
                    {r.n}
                  </td>
                  <td className="py-2 px-3 text-right text-white/60">
                    {r.winRate.toFixed(0)}%
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-medium ${
                      isProfit ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {isProfit ? "+" : "−"}${Math.abs(r.netPL).toFixed(2)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right ${
                      r.expectancy >= 0 ? "text-green-500/80" : "text-red-500/80"
                    }`}
                  >
                    {r.expectancy >= 0 ? "+" : "−"}$
                    {Math.abs(r.expectancy).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 hidden md:table-cell">
                    <div className="w-full h-2 bg-white/5 rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${
                          isProfit ? "bg-green-500/50" : "bg-red-500/50"
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Statistics({
  data,
  filteredData,
  option,
  strategy,
  status,
  symbol = "All",
  isFavourite = false,
}: {
  data: Trade[];
  filteredData: Trade[];
  option: string;
  strategy: string;
  status: string;
  symbol?: string;
  isFavourite?: boolean;
}) {
  // DATA STATS
  const closedData = data.filter((t) => t.status !== "OPEN");
  const closedFilteredData = filteredData.filter((t) => t.status !== "OPEN");

  const biggestWin = closedData.length
    ? closedData.reduce((max: Trade, trade: Trade) => {
        return tradeNetPL(trade) > tradeNetPL(max) ? trade : max;
      })
    : null;

  const biggestLoss = closedData.length
    ? closedData.reduce((max: Trade, trade: Trade) => {
        return tradeNetPL(max) > tradeNetPL(trade) ? trade : max;
      })
    : null;

  // Top summary tiles follow the active filters so the headline KPIs
  // match the Filter Insights table. The Filter Insights section itself
  // still shows the all-time baseline separately for delta comparison.
  const total = filteredData.length;
  const wins = filteredData.filter((trade) => trade.status === "WIN").length;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const netProfit = closedFilteredData.reduce(
    (acc: number, trade: Trade) => acc + tradeNetPL(trade),
    0,
  );

  const calcLongestWinStreak = (trades: Trade[]): number => {
    // Streaks reflect the chronological order trades were realized, so
    // sort by exit date (dateClosed), falling back to entry date if not set.
    const sorted = [...trades]
      .filter((t) => t.status !== "OPEN")
      .sort(
        (a, b) =>
          new Date(a.dateClosed || a.dateBought).getTime() -
          new Date(b.dateClosed || b.dateBought).getTime(),
      );

    let longest = 0;
    let current = 0;
    for (const t of sorted) {
      if (t.status === "WIN") {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }
    return longest;
  };

  const longestWinStreak = calcLongestWinStreak(filteredData);
  const longestFilteredWinStreak = calcLongestWinStreak(filteredData);

  // SUMMARY-TILE METRICS. Computed against the FILTERED dataset so the
  // headline tiles narrow with the page's Filters component. NET P/L
  // (gross minus fees) is used throughout.
  const grossWins = closedFilteredData
    .filter((t) => tradeNetPL(t) > 0)
    .reduce((sum, t) => sum + tradeNetPL(t), 0);

  const grossLosses = closedFilteredData
    .filter((t) => tradeNetPL(t) < 0)
    .reduce((sum, t) => sum + Math.abs(tradeNetPL(t)), 0);

  const profitFactor =
    grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  const winCount = closedFilteredData.filter(
    (t) => t.status === "WIN",
  ).length;
  const lossCount = closedFilteredData.filter(
    (t) => t.status === "LOSS",
  ).length;
  const concludedCount = winCount + lossCount;
  const winRatePct = concludedCount > 0 ? (winCount / concludedCount) * 100 : 0;

  const avgWin = winCount > 0 ? grossWins / winCount : 0;
  const avgLossAmt = lossCount > 0 ? grossLosses / lossCount : 0;
  const avgRR =
    avgLossAmt > 0 ? avgWin / avgLossAmt : avgWin > 0 ? Infinity : 0;

  const pfDonutPct =
    grossWins + grossLosses > 0
      ? (grossWins / (grossWins + grossLosses)) * 100
      : 0;

  const [visibility, setVisibility] = useLocalStorage<StatsVisibility>(
    "cuequill:stats-visibility",
    DEFAULT_VISIBILITY,
  );

  const anyTileVisible =
    visibility.netPL ||
    visibility.profitFactor ||
    visibility.winRate ||
    visibility.avgRR ||
    visibility.winStreak;

  // Performance by tag - for every tag that's been used at least once across
  // closed trades, compute trade count, total P/L, average P/L, and win rate.
  type TagStat = {
    label: string;
    count: number;
    totalPL: number;
    avgPL: number;
    winRate: number;
    kind: "mistake" | "good" | "other";
  };
  const tagStats: TagStat[] = useMemo(() => {
    const closed = data.filter(
      (t) => t.status === "WIN" || t.status === "LOSS",
    );
    const byTag = new Map<
      string,
      { count: number; totalPL: number; wins: number }
    >();
    for (const t of closed) {
      for (const tag of t.tags ?? []) {
        const prev = byTag.get(tag) ?? { count: 0, totalPL: 0, wins: 0 };
        prev.count += 1;
        prev.totalPL += tradeNetPL(t);
        if (t.status === "WIN") prev.wins += 1;
        byTag.set(tag, prev);
      }
    }
    return Array.from(byTag.entries())
      .map(([label, v]) => ({
        label,
        count: v.count,
        totalPL: v.totalPL,
        avgPL: v.count > 0 ? v.totalPL / v.count : 0,
        winRate: v.count > 0 ? (v.wins / v.count) * 100 : 0,
        kind: (TAG_KIND_BY_LABEL[label] ?? "other") as
          | "mistake"
          | "good"
          | "other",
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const strategyCounts: Record<string, number> = {};
  const optionCounts: Record<string, number> = {};
  const symbolCounts: Record<string, number> = {};

  data.forEach((trade) => {
    strategyCounts[trade.strategy] = (strategyCounts[trade.strategy] || 0) + 1;
    optionCounts[trade.option] = (optionCounts[trade.option] || 0) + 1;
    symbolCounts[trade.symbol] = (symbolCounts[trade.symbol] || 0) + 1;
  });

  const mostUsedStrat = Object.entries(strategyCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  const mostUsedOption = Object.entries(optionCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  const mostUsedSymbol = Object.entries(symbolCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  // ─── Performance Breakdown helpers ───────────────────────────────────
  // `summarize` collapses any subset of trades into a row of metrics. Used
  // for filter-vs-baseline comparisons and for per-category breakdowns
  // (strategy, symbol, day-of-week, CALL/PUT).
  const summarize = (subset: Trade[]) => {
    const closed = subset.filter(
      (t) => t.status === "WIN" || t.status === "LOSS",
    );
    const winsArr = closed.filter((t) => t.status === "WIN");
    const lossesArr = closed.filter((t) => t.status === "LOSS");
    const grossW = winsArr.reduce((s, t) => s + tradeNetPL(t), 0);
    const grossL = lossesArr.reduce((s, t) => s + Math.abs(tradeNetPL(t)), 0);
    const n = closed.length;
    return {
      n,
      wins: winsArr.length,
      losses: lossesArr.length,
      winRate: n > 0 ? (winsArr.length / n) * 100 : 0,
      netPL: grossW - grossL,
      avgWin: winsArr.length > 0 ? grossW / winsArr.length : 0,
      avgLoss: lossesArr.length > 0 ? grossL / lossesArr.length : 0,
      expectancy: n > 0 ? (grossW - grossL) / n : 0,
      profitFactor: grossL > 0 ? grossW / grossL : grossW > 0 ? Infinity : 0,
    };
  };

  const filteredSummary = summarize(filteredData);
  const totalSummary = summarize(data);

  // Per-category breakdowns. These operate on the FILTERED dataset so the
  // breakdown views narrow with the page's Filters component - by Symbol,
  // by Strategy, by CALL/PUT, streaks, and best/worst day all reflect the
  // currently-selected slice.
  const breakdown = (key: "strategy" | "symbol" | "option") => {
    const map = new Map<string, Trade[]>();
    for (const t of filteredData.filter((x) => x.status !== "OPEN")) {
      const k = String(t[key] ?? "-");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries())
      .map(([label, ts]) => ({ label, ...summarize(ts) }))
      .sort((a, b) => b.n - a.n);
  };
  const byStrategy = breakdown("strategy");
  const bySymbol = breakdown("symbol");
  const byOption = breakdown("option");

  // Streaks + drawdown - also follow the filter, so e.g. enabling a
  // "Strategy: MA40" filter shows the longest win streak within MA40 only.
  const closedByExit = [...filteredData]
    .filter((t) => t.status !== "OPEN")
    .sort(
      (a, b) =>
        new Date(a.dateClosed || a.dateBought).getTime() -
        new Date(b.dateClosed || b.dateBought).getTime(),
    );
  let curStreakLen = 0;
  let curStreakKind: "WIN" | "LOSS" | null = null;
  for (let i = closedByExit.length - 1; i >= 0; i--) {
    const t = closedByExit[i];
    if (curStreakKind === null) {
      curStreakKind = t.status === "WIN" ? "WIN" : "LOSS";
      curStreakLen = 1;
    } else if (t.status === curStreakKind) {
      curStreakLen++;
    } else {
      break;
    }
  }
  let longestLossStreak = 0;
  let runL = 0;
  for (const t of closedByExit) {
    if (t.status === "LOSS") {
      runL++;
      if (runL > longestLossStreak) longestLossStreak = runL;
    } else runL = 0;
  }
  // Longest WIN streak across the filtered subset (own computation rather
  // than the page-level `longestWinStreak`, which is all-time).
  let longestWinStreakFiltered = 0;
  let runW = 0;
  for (const t of closedByExit) {
    if (t.status === "WIN") {
      runW++;
      if (runW > longestWinStreakFiltered) longestWinStreakFiltered = runW;
    } else runW = 0;
  }
  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  for (const t of closedByExit) {
    cum += tradeNetPL(t);
    if (cum > peak) peak = cum;
    if (cum - peak < maxDD) maxDD = cum - peak;
  }

  // Best / worst trading day (by net P/L) - same filtered dataset
  const dayMap = new Map<string, number>();
  for (const t of filteredData.filter((x) => x.status !== "OPEN")) {
    const d = t.dateClosed
      ? new Date(t.dateClosed).toISOString().split("T")[0]
      : new Date(t.dateBought).toISOString().split("T")[0];
    dayMap.set(d, (dayMap.get(d) ?? 0) + tradeNetPL(t));
  }
  let bestDayStr = "";
  let bestDayPL = -Infinity;
  let worstDayStr = "";
  let worstDayPL = Infinity;
  for (const [d, pl] of dayMap) {
    if (pl > bestDayPL) {
      bestDayPL = pl;
      bestDayStr = d;
    }
    if (pl < worstDayPL) {
      worstDayPL = pl;
      worstDayStr = d;
    }
  }
  if (dayMap.size === 0) {
    bestDayPL = 0;
    worstDayPL = 0;
  }
  const profitableDays = Array.from(dayMap.values()).filter((v) => v > 0).length;
  const consistencyPct =
    dayMap.size > 0 ? (profitableDays / dayMap.size) * 100 : 0;

  // Active filter chips for context
  const activeFilters: Array<{ label: string; tone: "neutral" | "good" | "bad" }> =
    [];
  if (status !== "All")
    activeFilters.push({
      label: `Status: ${status}`,
      tone: status === "Win" ? "good" : "bad",
    });
  if (strategy !== "All")
    activeFilters.push({ label: `Strategy: ${strategy}`, tone: "neutral" });
  if (symbol !== "All")
    activeFilters.push({ label: `Symbol: ${symbol}`, tone: "neutral" });
  if (option !== "All")
    activeFilters.push({
      label: `Option: ${option}`,
      tone: option === "CALL" ? "good" : "bad",
    });
  if (isFavourite)
    activeFilters.push({ label: "Favourites only", tone: "neutral" });

  // Filter verdict
  const verdict = (() => {
    if (filteredSummary.n < 5)
      return { tone: "neutral" as const, label: "Need more trades" };
    const delta = filteredSummary.expectancy - totalSummary.expectancy;
    if (delta > 1) return { tone: "good" as const, label: "Outperforms baseline" };
    if (delta < -1) return { tone: "bad" as const, label: "Underperforms baseline" };
    return { tone: "neutral" as const, label: "Similar to baseline" };
  })();

  // MONTHLY DATA STATS
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const [date, setDate] = useState({
    monthIndex: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  // +1 when stepping forward in time, -1 when stepping back - drives
  // the slide direction of the month-detail panel.
  const [monthDir, setMonthDir] = useState<1 | -1>(1);

  const handlePrevMonth = () => {
    setMonthDir(-1);
    setDate((prev) => {
      const newMonth = prev.monthIndex === 0 ? 11 : prev.monthIndex - 1;
      const newYear = prev.monthIndex === 0 ? prev.year - 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  const handleNextMonth = () => {
    setMonthDir(1);
    setDate((prev) => {
      const newMonth = prev.monthIndex === 11 ? 0 : prev.monthIndex + 1;
      const newYear = prev.monthIndex === 11 ? prev.year + 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  // ── Mobile swipe for the monthly section ───────────────────────────
  // Same pattern as the calendar's AnimatedCalendar / WeekView swipe:
  // lock to horizontal once the user moves >10px on the x-axis, then
  // fire prev/next on release if the threshold is crossed. Vertical
  // scroll is unaffected because we set touch-action: pan-y.
  const monthSwipe = useRef<{
    x: number;
    y: number;
    mode: "idle" | "h" | "v";
  } | null>(null);

  const onMonthTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    monthSwipe.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      mode: "idle",
    };
  };

  const onMonthTouchMove = (e: React.TouchEvent) => {
    const s = monthSwipe.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (s.mode === "idle") {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) s.mode = "v";
      else if (Math.abs(dx) > 10) s.mode = "h";
    }
  };

  const onMonthTouchEnd = (e: React.TouchEvent) => {
    const s = monthSwipe.current;
    monthSwipe.current = null;
    if (!s || s.mode !== "h") return;
    const dx = e.changedTouches[0].clientX - s.x;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) handleNextMonth();
    else handlePrevMonth();
  };

  const currentMonth = months[date.monthIndex];
  const { year } = date;

  // Statistics-per-month browses by month independently of the page's
  // date-range filter - otherwise picking MTD/WTD would empty out every
  // other month. Other filters (status, strategy, symbol, option,
  // favourite) still apply so the breakdown stays meaningful.
  const dataIgnoringDateRange = useMemo(() => {
    return data.filter((trade) => {
      if (status === "Win" && trade.status !== "WIN") return false;
      if (status === "Loss" && trade.status !== "LOSS") return false;
      if (strategy !== "All" && trade.strategy !== strategy) return false;
      if (symbol !== "All" && trade.symbol !== symbol) return false;
      if (option !== "All" && trade.option !== option) return false;
      if (isFavourite && trade.favourite === false) return false;
      return true;
    });
  }, [data, status, strategy, symbol, option, isFavourite]);

  // Closed trades attribute to the month they were EXITED (matches broker
  // P/L accounting); open trades stay on their entry month.
  const monthlyData = dataIgnoringDateRange.filter((trade) => {
    const isClosed = trade.status === "WIN" || trade.status === "LOSS";
    const dateStr =
      isClosed && trade.dateClosed ? trade.dateClosed : trade.dateBought;
    const tradeDate = new Date(dateStr);
    return (
      tradeDate.getMonth() === date.monthIndex &&
      tradeDate.getFullYear() === date.year
    );
  });

  const monthlyWins = monthlyData.filter((t) => t.status === "WIN").length;
  const monthlyWinRate = monthlyData.length
    ? (monthlyWins / monthlyData.length) * 100
    : 0;

  const closedMonthlyData = monthlyData.filter((t) => t.status !== "OPEN");

  const calcBiggestMonthlyWin = () => {
    if (status === "Loss") return <span>-</span>;

    if (closedMonthlyData.length > 0) {
      const biggestMonthlyWin = closedMonthlyData.reduce(
        (max: Trade, trade: Trade) =>
          tradeNetPL(trade) > tradeNetPL(max) ? trade : max,
      );
      return (
        <span className="text-green-500">
          ${tradeNetPL(biggestMonthlyWin).toFixed(2)}
        </span>
      );
    }
  };

  const calcBiggestMonthlyLoss = () => {
    if (status === "Win") return <span>-</span>;

    if (closedMonthlyData.length > 0) {
      const biggestMonthlyLoss = closedMonthlyData.reduce(
        (max: Trade, trade: Trade) =>
          tradeNetPL(max) > tradeNetPL(trade) ? trade : max,
      );
      return (
        <span className="text-red-500">
          ${tradeNetPL(biggestMonthlyLoss).toFixed(2)}
        </span>
      );
    }
  };

  const netProfitMonthly = closedMonthlyData.reduce(
    (acc: number, trade: Trade) => acc + tradeNetPL(trade),
    0,
  );

  return (
    <div className="mt-10 flex flex-col items-center w-full max-w-[1500px]">
      {/* Customize toggle */}
      <div className="flex justify-end w-full mb-4">
        <CustomizeMenu visibility={visibility} setVisibility={setVisibility} />
      </div>

      {/* Summary tiles - at-a-glance, all-time */}
      {anyTileVisible && (
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 w-full mb-10">
          {visibility.netPL && (
            <SummaryTile
              label="Net P&L"
              info="Total profit/loss across all closed trades."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
            >
              <div
                className={`text-sm md:text-2xl truncate ${
                  netProfit >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {netProfit >= 0 ? "" : "−"}${Math.abs(netProfit).toFixed(2)}
              </div>
            </SummaryTile>
          )}

          {visibility.profitFactor && (
            <SummaryTile
              label="Profit Factor"
              info="Gross wins ÷ gross losses. Above 1.0 = profitable; above 2.0 = strong system."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
            >
              <div
                className={`text-sm md:text-2xl truncate ${
                  profitFactor >= 1 ? "text-green-500" : "text-red-500"
                }`}
              >
                {profitFactor === Infinity
                  ? "∞"
                  : profitFactor > 0
                    ? profitFactor.toFixed(2)
                    : "-"}
              </div>
              <div className="hidden md:block">
                <MiniDonut greenPct={pfDonutPct} />
              </div>
            </SummaryTile>
          )}

          {visibility.winRate && (
            <SummaryTile
              label="Win Rate"
              info="Percentage of closed trades that ended as wins."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
            >
              <div className="text-sm md:text-2xl truncate">
                {concludedCount > 0 ? `${winRatePct.toFixed(0)}%` : "-"}
              </div>
              <div className="hidden md:block">
                <MiniDonut greenPct={winRatePct} />
              </div>
            </SummaryTile>
          )}

          {visibility.avgRR && (
            <SummaryTile
              label="Avg R:R"
              info="Average winner size ÷ average loser size. Above 1R means your wins are bigger than your losses on average."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
            >
              <div
                className={`text-sm md:text-2xl truncate ${
                  avgRR === Infinity || avgRR >= 1
                    ? "text-green-500"
                    : avgRR > 0
                      ? "text-red-500"
                      : ""
                }`}
              >
                {avgRR === Infinity
                  ? "∞"
                  : avgRR > 0
                    ? `${avgRR.toFixed(2)}R`
                    : "-"}
              </div>
            </SummaryTile>
          )}

          {visibility.winStreak && (
            <SummaryTile
              label="Best Win Streak"
              info="Longest run of consecutive winning trades in your history (open trades are skipped, losses break the streak)."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
            >
              <div
                className={`text-sm md:text-2xl truncate ${
                  longestWinStreak > 0 ? "text-green-500" : ""
                }`}
              >
                {longestWinStreak > 0 ? longestWinStreak : "-"}
              </div>
            </SummaryTile>
          )}
        </div>
      )}

      {/* Equity curve */}
      {visibility.equityCurve && (
        <div className="w-full mb-10">
          <EquityCurve trades={data} />
        </div>
      )}

      {/* Performance by tag */}
      {visibility.tagStats && tagStats.length > 0 && (
        <div className="w-full mb-10 border border-[#282828] rounded-lg p-4 md:p-6">
          <div className="md:text-xl text-sm font-bold mb-4">
            Performance by tag
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-white/40">
                  <th className="text-left py-2 pr-3 font-normal">Tag</th>
                  <th className="text-right py-2 px-3 font-normal">Trades</th>
                  <th className="text-right py-2 px-3 font-normal">Win rate</th>
                  <th className="text-right py-2 px-3 font-normal">Avg P/L</th>
                  <th className="text-right py-2 pl-3 font-normal">Total P/L</th>
                </tr>
              </thead>
              <tbody>
                {tagStats.map((s) => (
                  <tr
                    key={s.label}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="py-2 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          s.kind === "mistake"
                            ? "bg-red-500/20 border-red-500 text-red-500"
                            : s.kind === "good"
                              ? "bg-green-500/20 border-green-500 text-green-500"
                              : "border-white/15 text-white/70"
                        }`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="text-right py-2 px-3 text-white/70">
                      {s.count}
                    </td>
                    <td className="text-right py-2 px-3 text-white/70">
                      {s.winRate.toFixed(0)}%
                    </td>
                    <td
                      className={`text-right py-2 px-3 font-medium ${
                        s.avgPL >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {s.avgPL >= 0 ? "+" : "−"}$
                      {Math.abs(s.avgPL).toFixed(2)}
                    </td>
                    <td
                      className={`text-right py-2 pl-3 font-medium ${
                        s.totalPL >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {s.totalPL >= 0 ? "+" : "−"}$
                      {Math.abs(s.totalPL).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Filter Insights ─────────────────────────────────────────── */}
      {visibility.filteredStats && (
        <div className="w-full mt-8 md:mt-16">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h3 className="md:text-xl text-sm font-bold">Filter Insights</h3>
              <InfoTooltip text="Compares the trades currently matching your filters against your all-time baseline. Use it to ask: 'Is this subset of trades actually better than my average?'" />
              <span className="text-xs text-white/40">
                {filteredSummary.n} closed
                {data.length > 0 && (
                  <>
                    {" "}
                    · {((filteredSummary.n / Math.max(1, closedData.length)) * 100).toFixed(0)}% of total
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <VerdictPill tone={verdict.tone} label={verdict.label} />
              <InfoTooltip text="Verdict comparing the filter's expectancy against your baseline expectancy. ≥ $1/trade better = Outperforms, ≤ $1 worse = Underperforms, within $1 = Similar. Needs at least 5 trades." />
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {activeFilters.map((f) => (
                <span
                  key={f.label}
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    f.tone === "good"
                      ? "bg-green-500/20 text-green-500"
                      : f.tone === "bad"
                      ? "bg-red-500/20 text-red-500"
                      : "bg-white/5 text-white/60"
                  }`}
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 md:gap-3">
            <CompareCard
              label="Win Rate"
              value={`${filteredSummary.winRate.toFixed(1)}%`}
              baseline={`${totalSummary.winRate.toFixed(1)}%`}
              delta={filteredSummary.winRate - totalSummary.winRate}
              deltaUnit="pp"
              higherIsBetter
              info="Percentage of closed trades in this filter that were winners. The delta compares against your overall win rate across all trades."
            />
            <CompareCard
              label="Expectancy"
              value={`$${filteredSummary.expectancy.toFixed(2)}`}
              baseline={`$${totalSummary.expectancy.toFixed(2)}`}
              delta={filteredSummary.expectancy - totalSummary.expectancy}
              deltaUnit="$"
              higherIsBetter
              info="Average net profit per trade in this filter. Positive = the filter is profitable on average."
            />
            <CompareCard
              label="Avg Win"
              value={`$${filteredSummary.avgWin.toFixed(2)}`}
              baseline={`$${totalSummary.avgWin.toFixed(2)}`}
              delta={filteredSummary.avgWin - totalSummary.avgWin}
              deltaUnit="$"
              higherIsBetter
              info="Average net profit on the winning trades inside this filter."
            />
            <CompareCard
              label="Avg Loss"
              value={`$${filteredSummary.avgLoss.toFixed(2)}`}
              baseline={`$${totalSummary.avgLoss.toFixed(2)}`}
              delta={filteredSummary.avgLoss - totalSummary.avgLoss}
              deltaUnit="$"
              higherIsBetter={false}
              info="Average net loss on the losing trades inside this filter. Smaller is better - a downward arrow is good here."
            />
            <CompareCard
              label="Profit Factor"
              value={
                filteredSummary.profitFactor === Infinity
                  ? "∞"
                  : filteredSummary.profitFactor.toFixed(2)
              }
              baseline={
                totalSummary.profitFactor === Infinity
                  ? "∞"
                  : totalSummary.profitFactor.toFixed(2)
              }
              delta={
                (filteredSummary.profitFactor === Infinity
                  ? 99
                  : filteredSummary.profitFactor) -
                (totalSummary.profitFactor === Infinity
                  ? 99
                  : totalSummary.profitFactor)
              }
              deltaUnit=""
              higherIsBetter
              info="Gross wins ÷ gross losses. Above 1.0 = profitable; above 2.0 = strong system."
            />
          </div>
        </div>
      )}

      {/* ── Performance Breakdown ───────────────────────────────────── */}
      {visibility.totalStats && (
        <div className="w-full mt-8 md:mt-16 flex flex-col gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <h3 className="md:text-xl text-sm font-bold">
              Performance Breakdown
            </h3>
            <InfoTooltip text="A bird's-eye view of where your edge is across your entire trading history - split by direction, strategy, symbol, streaks, and best/worst day." />
          </div>

          {/* CALL vs PUT */}
          <div className="flex items-center gap-1 text-xs text-white/60 uppercase tracking-wide">
            <span>CALL vs PUT</span>
            <InfoTooltip text="Side-by-side breakdown of how your CALLs and PUTs each perform. Compare net P/L, win rate, and average per trade to spot directional edge or bias." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(["CALL", "PUT"] as const).map((opt) => {
              const sub = byOption.find((b) => b.label === opt);
              if (!sub) return null;
              return (
                <div
                  key={opt}
                  className="border border-[#282828] rounded-lg p-4 flex flex-col gap-2"
                >
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        opt === "CALL" ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {opt}
                    </span>
                    <span className="text-xs text-white/40">
                      {sub.n} trades
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span
                      className={`text-sm md:text-2xl font-semibold truncate ${
                        sub.netPL >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {sub.netPL >= 0 ? "+" : "−"}${Math.abs(sub.netPL).toFixed(2)}
                    </span>
                    <span className="text-xs text-white/50">
                      {sub.winRate.toFixed(1)}% win rate
                    </span>
                  </div>
                  <div className="text-[11px] text-white/40 flex flex-col gap-0.5">
                    <span>Avg ${sub.expectancy.toFixed(2)}/trade</span>
                    <div className="flex flex-col md:flex-row md:gap-3 gap-0.5">
                      <span>W avg ${sub.avgWin.toFixed(2)}</span>
                      <span>L avg ${sub.avgLoss.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* By Strategy */}
          {byStrategy.length > 0 && (
            <BreakdownTable
              title="By Strategy"
              rows={byStrategy.slice(0, 8)}
              info="Net P/L and win rate for each strategy, ranked by trade count. Highlights which setups consistently make money and which are net losers."
            />
          )}

          {/* By Symbol */}
          {bySymbol.length > 0 && (
            <BreakdownTable
              title="By Symbol"
              rows={bySymbol.slice(0, 8)}
              info="Net P/L by ticker. The horizontal bar's width is relative to your biggest mover, green for profit and red for loss."
            />
          )}

          {/* Streaks & Risk */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              label="Current streak"
              value={
                curStreakKind === null
                  ? "-"
                  : `${curStreakKind === "WIN" ? "W" : "L"} × ${curStreakLen}`
              }
              tone={
                curStreakKind === "WIN"
                  ? "good"
                  : curStreakKind === "LOSS"
                  ? "bad"
                  : "neutral"
              }
              info="Your active streak - how many consecutive winners or losers your most recent trades are. A long loss streak can be a tilt warning."
            />
            <MiniStat
              label="Longest win streak"
              value={
                longestWinStreakFiltered > 0
                  ? `${longestWinStreakFiltered}`
                  : "-"
              }
              tone="good"
              info="Most consecutive winning trades inside the current filter. Open trades are ignored."
            />
            <MiniStat
              label="Longest loss streak"
              value={longestLossStreak > 0 ? `${longestLossStreak}` : "-"}
              tone="bad"
              info="Most consecutive losing trades. Useful for sizing - your risk per trade should survive a streak this long."
            />
            <MiniStat
              label="Max drawdown"
              value={maxDD < 0 ? `$${maxDD.toFixed(2)}` : "$0.00"}
              tone="bad"
              info="Largest peak-to-trough decline in cumulative net P/L. Measures the worst point you'd have been at, in dollars from your equity peak."
            />
          </div>

          {/* Best / Worst day + consistency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MiniStat
              label="Best day"
              value={
                bestDayStr
                  ? `${formatShortDate(bestDayStr)} · +$${bestDayPL.toFixed(2)}`
                  : "-"
              }
              tone="good"
              info="Single calendar day with the highest net P/L across all your trades closed that day."
            />
            <MiniStat
              label="Worst day"
              value={
                worstDayStr
                  ? `${formatShortDate(worstDayStr)} · −$${Math.abs(worstDayPL).toFixed(2)}`
                  : "-"
              }
              tone="bad"
              info="Single calendar day with the largest net loss. Compare to your daily max-loss rule."
            />
            <MiniStat
              label="Profitable days"
              value={`${consistencyPct.toFixed(0)}% (${profitableDays}/${dayMap.size})`}
              tone={consistencyPct >= 50 ? "good" : "bad"}
              info="Percentage of trading days that ended net positive. A high number with a low avg-win signals consistency; low + big avg-win signals lumpy P/L."
            />
          </div>
        </div>
      )}

      {/* Monthly Section */}
      {visibility.monthlyStats && (() => {
        const monthSummary = summarize(monthlyData);
        const closedMonthly = monthlyData.filter((t) => t.status !== "OPEN");
        const monthDayMap = new Map<string, number>();
        for (const t of closedMonthly) {
          const d = t.dateClosed
            ? new Date(t.dateClosed).toISOString().split("T")[0]
            : new Date(t.dateBought).toISOString().split("T")[0];
          monthDayMap.set(d, (monthDayMap.get(d) ?? 0) + tradeNetPL(t));
        }
        const tradedDays = monthDayMap.size;
        const greenDays = Array.from(monthDayMap.values()).filter(
          (v) => v > 0,
        ).length;
        const dayValues = Array.from(monthDayMap.values());
        const monthBestDay = dayValues.length ? Math.max(...dayValues) : 0;
        const monthWorstDay = dayValues.length ? Math.min(...dayValues) : 0;
        const monthBiggestWin = closedMonthly.length
          ? Math.max(...closedMonthly.map((t) => tradeNetPL(t)))
          : 0;
        const monthBiggestLoss = closedMonthly.length
          ? Math.min(...closedMonthly.map((t) => tradeNetPL(t)))
          : 0;
        const monthVerdict =
          monthSummary.n === 0
            ? { tone: "neutral" as const, label: "No trades" }
            : monthSummary.netPL > 0
            ? { tone: "good" as const, label: "Profitable month" }
            : monthSummary.netPL < 0
            ? { tone: "bad" as const, label: "Losing month" }
            : { tone: "neutral" as const, label: "Break-even" };

        return (
          <div className="w-full mt-8 md:mt-16 flex flex-col gap-4 md:gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="md:text-xl text-sm font-bold">
                Statistics per Month
              </h3>
              <VerdictPill
                tone={monthVerdict.tone}
                label={monthVerdict.label}
              />
            </div>

            {/* Month navigator */}
            <div className="border border-[#282828] rounded-lg flex items-center justify-between px-2 py-2 md:px-3 md:py-2.5">
              <button
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/5 text-base leading-none cursor-pointer"
              >
                ‹
              </button>
              <div className="text-sm md:text-base font-semibold">
                {currentMonth} {year}
              </div>
              <button
                onClick={handleNextMonth}
                aria-label="Next month"
                className="px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/5 text-base leading-none cursor-pointer"
              >
                ›
              </button>
            </div>

            <div
              onTouchStart={onMonthTouchStart}
              onTouchMove={onMonthTouchMove}
              onTouchEnd={onMonthTouchEnd}
              style={{ touchAction: "pan-y" }}
            >
            <AnimatePresence mode="wait" initial={false} custom={monthDir}>
              <motion.div
                key={`${year}-${date.monthIndex}`}
                custom={monthDir}
                variants={{
                  enter: (dir: number) => ({
                    opacity: 0,
                    x: dir > 0 ? 32 : -32,
                  }),
                  center: { opacity: 1, x: 0 },
                  exit: (dir: number) => ({
                    opacity: 0,
                    x: dir > 0 ? -32 : 32,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col gap-4 md:gap-6"
              >
            {monthlyData.length === 0 ? (
              <div className="border border-[#282828] rounded-lg p-8 text-center text-sm text-white/40">
                No trades for {currentMonth} {year}
              </div>
            ) : (
              <>
                {/* Headline tiles - same flex-wrap pattern as the top
                    summary tiles, so a lone orphan stretches full-width. */}
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <SummaryTile
                    label="Net P/L"
                    info="Total realized profit/loss for trades closed this month, after fees."
                    className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]"
                  >
                    <div
                      className={`text-sm md:text-2xl font-semibold truncate ${
                        monthSummary.netPL >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {monthSummary.netPL >= 0 ? "+" : "−"}$
                      {Math.abs(monthSummary.netPL).toFixed(2)}
                    </div>
                  </SummaryTile>
                  <SummaryTile
                    label="Trades"
                    info="Closed trades this month."
                    className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]"
                  >
                    <div className="text-sm md:text-2xl font-semibold truncate">
                      {monthSummary.n}
                    </div>
                  </SummaryTile>
                  <SummaryTile
                    label="Win Rate"
                    info="Percentage of closed trades this month that were winners."
                    className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]"
                  >
                    <div
                      className={`text-sm md:text-2xl font-semibold truncate ${
                        monthSummary.winRate >= 50
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {monthSummary.winRate.toFixed(0)}%
                    </div>
                  </SummaryTile>
                  <SummaryTile
                    label="Avg / Trade"
                    info="Average net profit per trade this month (expectancy)."
                    className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]"
                  >
                    <div
                      className={`text-sm md:text-2xl font-semibold truncate ${
                        monthSummary.expectancy >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {monthSummary.expectancy >= 0 ? "+" : "−"}$
                      {Math.abs(monthSummary.expectancy).toFixed(2)}
                    </div>
                  </SummaryTile>
                </div>

                {/* Detail tiles */}
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <div className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]">
                    <MiniStat
                      label="Biggest win"
                      value={
                        monthBiggestWin > 0
                          ? `+$${monthBiggestWin.toFixed(2)}`
                          : "-"
                      }
                      tone="good"
                      info="Largest single winning trade closed this month."
                    />
                  </div>
                  <div className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]">
                    <MiniStat
                      label="Worst loss"
                      value={
                        monthBiggestLoss < 0
                          ? `−$${Math.abs(monthBiggestLoss).toFixed(2)}`
                          : "-"
                      }
                      tone="bad"
                      info="Largest single losing trade closed this month."
                    />
                  </div>
                  <div className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]">
                    <MiniStat
                      label="Best day"
                      value={
                        monthBestDay > 0
                          ? `+$${monthBestDay.toFixed(2)}`
                          : "-"
                      }
                      tone="good"
                      info="Best single calendar day this month - sum of all trades closed that day."
                    />
                  </div>
                  <div className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]">
                    <MiniStat
                      label="Worst day"
                      value={
                        monthWorstDay < 0
                          ? `−$${Math.abs(monthWorstDay).toFixed(2)}`
                          : "-"
                      }
                      tone="bad"
                      info="Worst single calendar day this month."
                    />
                  </div>
                  <div className="basis-[100px] md:basis-[200px] grow md:max-w-[280px]">
                    <MiniStat
                      label="Days traded"
                      value={
                        tradedDays > 0
                          ? `${tradedDays} (${greenDays} green)`
                          : "-"
                      }
                      tone={
                        greenDays > tradedDays - greenDays ? "good" : "bad"
                      }
                      info="Number of distinct calendar days you closed trades this month, with the count of profitable days in parentheses."
                    />
                  </div>
                </div>
              </>
            )}
              </motion.div>
            </AnimatePresence>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
