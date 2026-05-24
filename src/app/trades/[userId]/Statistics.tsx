"use client";

import Bar from "@/app/dashboard/components/charts/Bar";
import Pie from "@/app/dashboard/components/charts/Pie";
import { TAG_KIND_BY_LABEL } from "@/app/data/tradeTags";
import { Trade } from "@/app/types/Trades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import EquityCurve from "./EquityCurve";

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
  { key: "filteredStats", label: "Filtered Stats" },
  { key: "totalStats", label: "Total Stats" },
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
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex group">
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
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                    bg-[#16151B] border border-white/10 text-white/80 text-[11px] rounded-md px-2 py-1.5
                    whitespace-normal w-48 z-20 leading-snug shadow-md normal-case
                    ${open ? "block" : "hidden md:group-hover:block"}`}
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
    <div className="text-[10px] md:text-xs text-white/50 flex items-center gap-1.5">
      <span>{label}</span>
      {info && <InfoTooltip text={info} />}
    </div>
    <div className="flex items-center justify-between gap-2">{children}</div>
  </div>
);

export default function Statistics({
  data,
  filteredData,
  option,
  strategy,
  status,
}: {
  data: Trade[];
  filteredData: Trade[];
  option: string;
  strategy: string;
  status: string;
}) {
  // DATA STATS
  const closedData = data.filter((t) => t.status !== "OPEN");
  const closedFilteredData = filteredData.filter((t) => t.status !== "OPEN");

  const biggestWin = closedData.length
    ? closedData.reduce((max: Trade, trade: Trade) => {
        return (trade.profitLoss ?? 0) > (max.profitLoss ?? 0) ? trade : max;
      })
    : null;

  const biggestLoss = closedData.length
    ? closedData.reduce((max: Trade, trade: Trade) => {
        return (max.profitLoss ?? 0) > (trade.profitLoss ?? 0) ? trade : max;
      })
    : null;

  const total = data.length;
  const wins = data.filter((trade) => trade.status === "WIN").length;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const netProfit = closedData.reduce(
    (acc: number, trade: Trade) => acc + (trade.profitLoss ?? 0),
    0,
  );

  const calcLongestWinStreak = (trades: Trade[]): number => {
    const sorted = [...trades]
      .filter((t) => t.status !== "OPEN")
      .sort(
        (a, b) =>
          new Date(a.dateBought).getTime() - new Date(b.dateBought).getTime(),
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

  const longestWinStreak = calcLongestWinStreak(data);
  const longestFilteredWinStreak = calcLongestWinStreak(filteredData);

  // SUMMARY-TILE METRICS (all-time)
  const grossWins = closedData
    .filter((t) => (t.profitLoss ?? 0) > 0)
    .reduce((sum, t) => sum + (t.profitLoss ?? 0), 0);

  const grossLosses = closedData
    .filter((t) => (t.profitLoss ?? 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t.profitLoss ?? 0), 0);

  const profitFactor =
    grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  const winCount = closedData.filter((t) => t.status === "WIN").length;
  const lossCount = closedData.filter((t) => t.status === "LOSS").length;
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

  // Performance by tag — for every tag that's been used at least once across
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
        prev.totalPL += t.profitLoss ?? 0;
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

  // FILTERED DATA STATS
  const calcBiggestFilteredWin = () => {
    if (status === "Loss") return <span>-</span>;

    const biggestFilteredWin = closedFilteredData
      .filter((trade) => (trade.profitLoss ?? 0) > 0)
      .reduce((max, trade) => Math.max(max, trade.profitLoss ?? 0), 0);

    if (biggestFilteredWin === null) {
      return null;
    } else {
      return (
        <span className="text-green-500">${biggestFilteredWin.toFixed(2)}</span>
      );
    }
  };

  const calcBiggestFilteredLoss = () => {
    if (status === "Win") return <span>-</span>;

    const biggestFilteredLoss = closedFilteredData
      .filter((trade) => (trade.profitLoss ?? 0) < 0)
      .reduce((min, trade) => Math.min(min, trade.profitLoss ?? 0), 0);

    if (biggestFilteredLoss === null) {
      return null;
    } else {
      return (
        <span className="text-red-500">${biggestFilteredLoss.toFixed(2)}</span>
      );
    }
  };

  const calcFilteredWinRate = () => {
    if (status === "Loss") return <span>-</span>;

    const filteredTotal = filteredData.length;
    const filteredWins = filteredData.filter(
      (trade) => trade.status === "WIN",
    ).length;

    const filteredWinRate =
      total > 0 ? (filteredWins / filteredTotal) * 100 : 0;

    return (
      <span className="text-green-500">{filteredWinRate.toFixed(2)}%</span>
    );
  };

  const calcFilteredNetProfit = () => {
    const filteredNetProfit = closedFilteredData.reduce(
      (acc: number, trade: Trade) => acc + (trade.profitLoss ?? 0),
      0,
    );

    if (filteredNetProfit >= 0) {
      return (
        <span className="text-green-500">${filteredNetProfit.toFixed(2)}</span>
      );
    } else {
      return (
        <span className="text-red-500">${filteredNetProfit.toFixed(2)}</span>
      );
    }
  };

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

  const handlePrevMonth = () => {
    setDate((prev) => {
      const newMonth = prev.monthIndex === 0 ? 11 : prev.monthIndex - 1;
      const newYear = prev.monthIndex === 0 ? prev.year - 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  const handleNextMonth = () => {
    setDate((prev) => {
      const newMonth = prev.monthIndex === 11 ? 0 : prev.monthIndex + 1;
      const newYear = prev.monthIndex === 11 ? prev.year + 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  const currentMonth = months[date.monthIndex];
  const { year } = date;

  const monthlyData = filteredData.filter((trade) => {
    const tradeDate = new Date(trade.dateBought);
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
          (trade.profitLoss ?? 0) > (max.profitLoss ?? 0) ? trade : max,
      );
      return (
        <span className="text-green-500">
          ${biggestMonthlyWin.profitLoss?.toFixed(2)}
        </span>
      );
    }
  };

  const calcBiggestMonthlyLoss = () => {
    if (status === "Win") return <span>-</span>;

    if (closedMonthlyData.length > 0) {
      const biggestMonthlyLoss = closedMonthlyData.reduce(
        (max: Trade, trade: Trade) =>
          (max.profitLoss ?? 0) > (trade.profitLoss ?? 0) ? trade : max,
      );
      return (
        <span className="text-red-500">
          ${biggestMonthlyLoss.profitLoss?.toFixed(2)}
        </span>
      );
    }
  };

  const netProfitMonthly = closedMonthlyData.reduce(
    (acc: number, trade: Trade) => acc + (trade.profitLoss ?? 0),
    0,
  );

  return (
    <div className="mt-10 flex flex-col items-center w-full max-w-[1500px]">
      {/* Customize toggle */}
      <div className="flex justify-end w-full mb-4">
        <CustomizeMenu visibility={visibility} setVisibility={setVisibility} />
      </div>

      {/* Summary tiles — at-a-glance, all-time */}
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
                    : "—"}
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
                {concludedCount > 0 ? `${winRatePct.toFixed(0)}%` : "—"}
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
                    : "—"}
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
                {longestWinStreak > 0 ? longestWinStreak : "—"}
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
          <div className="text-sm font-semibold mb-4">Performance by tag</div>
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
                            ? "bg-red-500/15 border-red-500/40 text-red-300"
                            : s.kind === "good"
                              ? "bg-green-500/15 border-green-500/40 text-green-300"
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

      {/* Trades Stats */}
      {(visibility.filteredStats || visibility.totalStats) && (
      <div className="flex w-full flex-col justify-between xl:flex-row">
        {/* Filtered Stats */}
        {visibility.filteredStats && (
        <div className="flex flex-col items-center w-full gap-6 md:gap-0">
          <div className="mb-0 md:mb-5 text-sm font-bold">
            Statistics for Filtered Trades
          </div>
          <div className="flex md:gap-6 gap-0 w-full min-[1280px]:pr-6">
            <div className="flex md:flex-col gap-6 w-full max-[500px]:flex-col">
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>Total trades: {filteredData.length}</div>
                <div>Strategy: {strategy}</div>
                <div>Status: {status}</div>
                <div>Option: {option}</div>
              </div>
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>Biggest win: {calcBiggestFilteredWin()}</div>
                <div>Biggest loss: {calcBiggestFilteredLoss()}</div>
                <div>Win rate: {calcFilteredWinRate()}</div>
                <div>Net profit: {calcFilteredNetProfit()}</div>
                <div>
                  Win streak:{" "}
                  {longestFilteredWinStreak > 0 ? (
                    <span className="text-green-500">
                      {longestFilteredWinStreak}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="hidden md:flex flex-col items-center border border-[#282828] rounded-lg py-5 pb-1">
                <Pie
                  data={filteredData}
                  innerRadius={40}
                  outerRadius={60}
                  width={130}
                  height={130}
                  fontSize={12}
                />
                <Bar
                  data={filteredData}
                  width={230}
                  height={160}
                  translate={-20}
                />
              </div>
            </div>
          </div>
          <div className="flex md:hidden md:flex-col items-center justify-center border border-[#282828] rounded-lg py-5 w-full  min-[400px]:gap-0">
            <Pie
              data={filteredData}
              innerRadius={35}
              outerRadius={50}
              width={100}
              height={100}
              fontSize={10}
            />
            <div className="w-40">
              <Bar data={filteredData} width={200} height={150} translate={0} />
            </div>
          </div>
        </div>
        )}
        {visibility.filteredStats && visibility.totalStats && (
        <div className="h-auto w-1 bg-[#3A3A3A]"></div>
        )}
        {/* Total Stats */}
        {visibility.totalStats && (
        <div className="flex flex-col items-center w-full gap-6 md:gap-0 mt-10 xl:mt-0 min-[1280px]:ml-6">
          <div className="mb-0 md:mb-5 text-sm font-bold">Total Statistics</div>
          <div className="flex md:gap-6 gap-0 w-full min-[1280px]:pr-6">
            <div className="flex md:flex-col gap-6 w-full max-[500px]:flex-col">
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>Total trades: {data.length}</div>
                <div className="truncate" title={mostUsedStrat}>
                  Top strat: {mostUsedStrat}
                </div>
                <div>
                  Top option:{" "}
                  <span
                    className={
                      mostUsedOption === "CALL"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {mostUsedOption}
                  </span>
                </div>
                <div>Top symbol: {mostUsedSymbol}</div>
              </div>
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>
                  Biggest win:{" "}
                  {biggestWin ? (
                    <span className="text-green-500">
                      ${biggestWin.profitLoss?.toFixed(2)}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div>
                  Biggest loss:{" "}
                  {biggestLoss ? (
                    <span className="text-red-500">
                      ${biggestLoss.profitLoss?.toFixed(2)}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div>
                  Win rate:{" "}
                  <span className="text-green-500">{winRate.toFixed(2)}%</span>
                </div>
                <div>
                  Net profit:{" "}
                  <span
                    className={`${
                      netProfit >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    ${netProfit.toFixed(2)}
                  </span>
                </div>
                <div>
                  Win streak:{" "}
                  {longestWinStreak > 0 ? (
                    <span className="text-green-500">{longestWinStreak}</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="hidden md:flex flex-col items-center border border-[#282828] rounded-lg py-5 pb-1">
                <Pie
                  data={data}
                  innerRadius={40}
                  outerRadius={60}
                  width={130}
                  height={130}
                  fontSize={12}
                />
                <Bar data={data} width={230} height={160} translate={-20} />
              </div>
            </div>
          </div>
          <div className="flex md:hidden md:flex-col items-center justify-center border border-[#282828] rounded-lg py-5 w-full min-[400px]:gap-0">
            <Pie
              data={data}
              innerRadius={35}
              outerRadius={50}
              width={100}
              height={100}
              fontSize={10}
            />
            <div className="w-40">
              <Bar data={data} width={200} height={150} translate={0} />
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {/* Monthly Section */}
      {visibility.monthlyStats && (
      <div className="flex flex-col items-center mt-10 md:mt-20 w-full max-w-[1000px]">
        <div className="md:text-xl text-sm font-bold">Statistics per Month</div>

        <div className="flex flex-col border border-[#282828] rounded-md w-full mt-5">
          <div className="flex justify-between p-2 border-b border-[#343434] items-center">
            <div
              onClick={handlePrevMonth}
              className="cursor-pointer hover:text-gray-400"
            >
              &lt;
            </div>
            <div className="text-xs md:text-base">
              {currentMonth} {year}
            </div>
            <div
              onClick={handleNextMonth}
              className="cursor-pointer hover:text-gray-400"
            >
              &gt;
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-5">
            {monthlyData.length > 0 ? (
              <div className="flex flex-col min-[500px]:flex-row justify-between w-full">
                <div className="flex flex-col gap-2 p-5 text-xs md:text-base">
                  <div>Total trades: {monthlyData.length}</div>
                  <div>Biggest win: {calcBiggestMonthlyWin()}</div>
                  <div>Biggest loss: {calcBiggestMonthlyLoss()}</div>
                  <div>
                    Win rate:{" "}
                    {monthlyWinRate === 0 ? (
                      <span>-</span>
                    ) : (
                      <span className="text-green-500">
                        {monthlyWinRate.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div>
                    Profit:{" "}
                    <span
                      className={`${
                        netProfitMonthly >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      ${netProfitMonthly.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex md:hidden items-center min-[500px]:justify-end justify-center min-[500px]:w-1/2 max-w-140">
                  <Pie
                    data={monthlyData}
                    innerRadius={35}
                    outerRadius={50}
                    height={100}
                    width={100}
                    fontSize={13}
                  />
                  <Bar
                    data={monthlyData}
                    height={150}
                    width={170}
                    translate={0}
                  />
                </div>
                <div className="hidden md:flex items-center justify-end w-1/2 max-w-140">
                  <Pie
                    data={monthlyData}
                    innerRadius={50}
                    outerRadius={70}
                    height={150}
                    width={150}
                    fontSize={13}
                  />
                  <Bar
                    data={monthlyData}
                    height={180}
                    width={200}
                    translate={-10}
                  />
                </div>
              </div>
            ) : (
              <div className="p-10">
                No trades found for {currentMonth} {year}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
