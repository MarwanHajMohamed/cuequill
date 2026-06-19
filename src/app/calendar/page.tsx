"use client";

import "./custom-calendar.css";
import { useFedDates } from "@/hooks/useFedDates";
import { useMarketHolidays } from "@/hooks/useMarketHolidays";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useSession } from "next-auth/react";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import DayTradesModal from "../dashboard/components/modals/DayTradesModal";
import TradeModal from "../dashboard/components/modals/TradeModal";
import { useQueryClient } from "@tanstack/react-query";
import { Trade } from "../types/Trades";
import { withAuth } from "@/lib/withAuth";
import AnimatedCalendar from "../reusablecalendar/AnimatedCalendar";
import WeekView from "./WeekView";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { AnimatePresence } from "framer-motion";

import { fmtMoneyCompact, fmtMoneySignedCompact } from "@/lib/helpers/fmt";
type TradeEvent =
  | Trade
  | {
      date: string;
      status: "TODAY";
    };

const now = new Date();
const today = now.toISOString().split("T")[0];

// Week-summary card for the calendar sidebar (desktop only).
const WeekSummary = ({
  weekNum,
  netPL,
  tradeCount,
  daysWithTrades,
}: {
  weekNum: number;
  netPL: number;
  tradeCount: number;
  daysWithTrades: number;
}) => {
  const hasTrades = tradeCount > 0;
  return (
    <div className="border border-[var(--hairline)] rounded-lg p-3 flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <div className="text-xs text-white/60">Week {weekNum}</div>
        {hasTrades && (
          <div className="text-[10px] text-white/40 uppercase tracking-wide">
            Total
          </div>
        )}
      </div>
      {hasTrades ? (
        <>
          <div className="flex justify-between items-baseline gap-2">
            <div
              className={`text-lg font-semibold ${
                netPL >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {fmtMoneySignedCompact(netPL)}
            </div>
            <div className="text-xs text-white/60 whitespace-nowrap">
              {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
            </div>
          </div>
          <div className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 w-fit">
            {daysWithTrades} {daysWithTrades === 1 ? "day" : "days"}
          </div>
        </>
      ) : null}
    </div>
  );
};

function Page() {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const value = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dayListOpen, setDayListOpen] = useState(false);
  const [view, setView] = useState<"month" | "week">("month");
  // react-calendar internal view ("month" = day grid, "year" = month
  // grid, "decade" = year grid). The week-summaries sidebar is only
  // meaningful for the day grid.
  const [calView, setCalView] = useState<string>("month");

  // Shared ref - either AnimatedCalendar or WeekView is mounted at a time
  // and both expose a goToToday() via useImperativeHandle.
  const calRef = useRef<{ goToToday: () => void } | null>(null);
  const goToToday = () => calRef.current?.goToToday();

  // Track which month the AnimatedCalendar is showing, so the week-summary
  // sidebar can reflect the same view.
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => new Date());
  // Mon-start of the currently visible week (week view). Updated via
  // WeekView's onWeekChange callback so we can show a week summary.
  const [displayedWeekStart, setDisplayedWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const calendarColRef = useRef<HTMLDivElement>(null);
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const [sidebarRows, setSidebarRows] = useState<string>("");

  const manualTrades: Trade[] = useMemo<Trade[]>(() => [], []);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const { data: trades } = useTrades(userId, simulated);
  const fedDates = useFedDates();
  const holidays = useMarketHolidays();

  // Measure the actual y-offset of the calendar's days grid (nav + weekday
  // header height) so the sidebar starts at the same vertical position as
  // the first day row. Runs again whenever data that can shift heights
  // changes.
  useLayoutEffect(() => {
    if (view !== "month") return;

    const measure = () => {
      if (!calendarColRef.current) return;
      const days = calendarColRef.current.querySelector(
        ".react-calendar__month-view__days",
      ) as HTMLElement | null;
      if (!days) return;
      const colRect = calendarColRef.current.getBoundingClientRect();
      const daysRect = days.getBoundingClientRect();
      setSidebarOffset(Math.max(0, daysRect.top - colRect.top));
      // Mirror the day grid's actual row heights so each week card lines
      // up with its calendar row even when content stretches a row past
      // the 110px min.
      setSidebarRows(getComputedStyle(days).gridTemplateRows);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(calendarColRef.current!);
    const days = calendarColRef.current?.querySelector(
      ".react-calendar__month-view__days",
    );
    if (days) ro.observe(days);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [view, displayedMonth, trades]);

  // Bucket each trade on its EXIT (dateClosed) for WIN/LOSS, and on its
  // ENTRY (dateBought) for OPEN. This matches broker P/L attribution: a
  // trade is realized on the day it closes, not the day it opens, so trades
  // that span a month boundary land in the close month.
  const tradeEvents: TradeEvent[] = useMemo(() => {
    const baseEvents: TradeEvent[] = trades
      ? trades.map((trade) => {
          const isClosed = trade.status === "WIN" || trade.status === "LOSS";
          const bucketDate =
            isClosed && trade.dateClosed
              ? trade.dateClosed.split("T")[0]
              : trade.dateBought.split("T")[0];
          return {
            _id: trade._id,
            date: bucketDate,
            status: trade.status,
            symbol: trade.symbol,
            contractPrice: trade.contractPrice,
            dateBought: trade.dateBought,
            dateClosed: trade.dateClosed,
            expiryDate: trade.expiryDate,
            option: trade.option,
            qty: trade.qty,
            simulated: trade.simulated,
            strategy: trade.strategy,
            strike: trade.strike,
            closingContractPrice: trade.closingContractPrice,
            notes: trade.notes,
            profitLoss: trade.profitLoss,
            fees: trade.fees,
            favourite: trade.favourite,
          };
        })
      : [];

    return [{ date: today, status: "TODAY" }, ...baseEvents, ...manualTrades];
  }, [trades, manualTrades]);

  // A trade belongs on a given day if it's open and was entered that day,
  // or if it's closed and was exited that day.
  const bucketDateFor = (t: Trade) => {
    const isClosed = t.status === "WIN" || t.status === "LOSS";
    return isClosed && t.dateClosed
      ? t.dateClosed.split("T")[0]
      : t.dateBought.split("T")[0];
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayStr = format(date, "yyyy-MM-dd");
    const dayTrades = trades?.filter((t) => bucketDateFor(t) === dayStr) ?? [];
    if (dayTrades.length > 0) {
      setDayListOpen(true);
    } else {
      setEditingTrade(null);
      setIsModalOpen(true);
    }
  };

  const tradesForSelectedDay = useMemo(() => {
    if (!selectedDate || !trades) return [];
    const dayStr = format(selectedDate, "yyyy-MM-dd");
    return trades.filter((t) => bucketDateFor(t) === dayStr);
  }, [selectedDate, trades]);

  // Per-week summaries for the displayed month - used by the sidebar.
  // Buckets trades by the date string (yyyy-MM-dd) prefix of dateBought, the
  // same way the calendar tiles do, so totals match what each day shows.
  const weekSummaries = useMemo(() => {
    const monthStart = startOfMonth(displayedMonth);
    const monthEnd = endOfMonth(displayedMonth);
    const monthStartStr = format(monthStart, "yyyy-MM-dd");
    const monthEndStr = format(monthEnd, "yyyy-MM-dd");

    type Bucket = {
      weekNum: number;
      tradeCount: number;
      netPL: number;
      daysWithTrades: number;
    };
    const buckets: Bucket[] = [];
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    let weekNum = 1;
    while (weekStart <= monthEnd) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      const inWeek = (trades ?? []).filter((t) => {
        const isClosed = t.status === "WIN" || t.status === "LOSS";
        const dayStr =
          isClosed && t.dateClosed
            ? t.dateClosed.split("T")[0]
            : t.dateBought.split("T")[0];
        return (
          dayStr >= weekStartStr &&
          dayStr <= weekEndStr &&
          dayStr >= monthStartStr &&
          dayStr <= monthEndStr
        );
      });
      const closed = inWeek.filter(
        (t) => t.status === "WIN" || t.status === "LOSS",
      );
      const netPL = closed.reduce((sum, t) => sum + tradeNetPL(t), 0);
      const days = new Set(
        inWeek.map((t) => {
          const isClosed = t.status === "WIN" || t.status === "LOSS";
          return isClosed && t.dateClosed
            ? t.dateClosed.split("T")[0]
            : t.dateBought.split("T")[0];
        }),
      );
      buckets.push({
        weekNum,
        tradeCount: inWeek.length,
        netPL,
        daysWithTrades: days.size,
      });
      weekStart = addDays(weekEnd, 1);
      weekNum++;
    }
    return buckets;
  }, [trades, displayedMonth]);

  const handleSaveTrade = async (trade: Trade) => {
    if (trade._id) {
      // UPDATE EXISTING TRADE
      await fetch(`/api/trades/${trade._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
    } else {
      // CREATE NEW TRADE
      await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trade, userId }),
      });
    }

    await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
    setIsModalOpen(false);
    setEditingTrade(null);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    try {
      await fetch(`/api/trades/${tradeId}`, {
        method: "DELETE",
      });

      await queryClient.invalidateQueries({ queryKey: ["trades", userId] });

      setIsModalOpen(false);
      setEditingTrade(null);
    } catch (err) {
      console.error("Failed to delete trade", err);
    }
  };

  const getDaySummary = (date: Date) => {
    const dayStr = format(date, "yyyy-MM-dd");
    const events = tradeEvents.filter((e) => e.date === dayStr);
    const tradeEvts = events.filter((e) => e.status !== "TODAY") as Trade[];
    const winCount = tradeEvts.filter((e) => e.status === "WIN").length;
    const lossCount = tradeEvts.filter((e) => e.status === "LOSS").length;
    const closedEvts = tradeEvts.filter(
      (e) => e.status === "WIN" || e.status === "LOSS",
    );
    const netPL = closedEvts.reduce((sum, e) => sum + tradeNetPL(e), 0);
    const hasOpen = tradeEvts.some((e) => e.status === "OPEN");
    const isToday = events.some((e) => e.status === "TODAY");
    return {
      tradeCount: tradeEvts.length,
      closedCount: closedEvts.length,
      winCount,
      lossCount,
      netPL,
      hasOpen,
      isToday,
      isFed: fedDates.has(dayStr),
      marketDay: holidays.get(dayStr) ?? null,
    };
  };

  const renderTileContent = ({ date, view }: { date: Date; view: string }) => {
    // Year drill-up view: each tile is a month - show monthly P/L + count.
    if (view === "year") {
      const { total, closedCount, netPL } = getMonthSummary(date);
      if (total === 0) return null;
      return (
        <div className="mt-1 flex flex-col items-center gap-0.5 text-[10px] md:text-xs">
          {closedCount > 0 ? (
            <div
              className={`font-semibold ${
                netPL >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {fmtMoneySignedCompact(netPL)}
            </div>
          ) : (
            <div className="font-semibold text-orange-400">Open</div>
          )}
          <div className="text-white/40 text-[9px] md:text-[10px]">
            {total} {total === 1 ? "trade" : "trades"}
          </div>
        </div>
      );
    }

    const {
      tradeCount,
      closedCount,
      winCount,
      lossCount,
      netPL,
      isToday,
      isFed,
      marketDay,
    } = getDaySummary(date);
    if (tradeCount === 0 && !isToday && !isFed && !marketDay) return null;

    return (
      <>
        {isFed && (
          <span className="absolute top-1 right-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/35 text-purple-100 border border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.35)] text-[9px] md:text-[10px] font-bold uppercase tracking-wide leading-none">
            <span className="w-1 h-1 rounded-full bg-purple-200" aria-hidden />
            Fed
          </span>
        )}
        {marketDay &&
          (marketDay.early ? (
            <span
              title={`Early close 1:00pm ET — ${marketDay.name}`}
              className="absolute top-1 right-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/35 text-sky-100 border border-sky-400/60 shadow-[0_0_8px_rgba(56,189,248,0.35)] text-[9px] md:text-[10px] font-bold uppercase tracking-wide leading-none"
            >
              <i className="fa-solid fa-clock text-[8px]" aria-hidden />
              1pm
            </span>
          ) : (
            <span
              title={`Market closed — ${marketDay.name}`}
              className="absolute top-1 right-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/35 text-amber-100 border border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.4)] text-[9px] md:text-[10px] font-bold uppercase tracking-wide leading-none"
            >
              <i className="fa-solid fa-lock text-[8px]" aria-hidden />
              Closed
            </span>
          ))}
        {isToday && (
          <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
        )}
        {/* Bottom-left: P/L, trade count, then W/L bars underneath */}
        {tradeCount > 0 && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col items-start gap-1 text-[10px] md:text-xs">
            {closedCount > 0 ? (
              <div
                className={`font-semibold leading-tight ${
                  netPL >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {fmtMoneySignedCompact(netPL)}
              </div>
            ) : (
              <div className="font-semibold text-orange-400 leading-tight">
                Open
              </div>
            )}
            <div className="text-white/40 text-[9px] md:text-[10px] leading-tight">
              {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
            </div>
            {(winCount > 0 || lossCount > 0) && (
              <div
                className="flex items-center gap-1 mt-0.5 w-full mb-1"
                style={{ maxWidth: 64 }}
              >
                {lossCount > 0 && (
                  <div
                    className="flex items-center gap-0.5"
                    style={{ flex: lossCount }}
                  >
                    <div className="flex-1 h-1.5 md:h-2 bg-red-500 rounded-sm min-w-0" />
                    <div className="text-[9px] md:text-[10px] text-red-400 leading-none">
                      {lossCount}
                    </div>
                  </div>
                )}
                {winCount > 0 && (
                  <div
                    className="flex items-center gap-0.5"
                    style={{ flex: winCount }}
                  >
                    <div className="flex-1 h-1.5 md:h-2 bg-green-500 rounded-sm min-w-0" />
                    <div className="text-[9px] md:text-[10px] text-green-400 leading-none">
                      {winCount}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderTileClassName = ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => {
    if (view === "year") {
      const { closedCount, netPL, hasOpen } = getMonthSummary(date);
      if (closedCount > 0) return netPL >= 0 ? "day-win" : "day-loss";
      if (hasOpen) return "day-open";
      return "";
    }
    const { closedCount, netPL, hasOpen } = getDaySummary(date);
    if (closedCount > 0) return netPL >= 0 ? "day-win" : "day-loss";
    if (hasOpen) return "day-open";
    return "";
  };

  // Per-month aggregation (keyed "yyyy-MM") for the year drill-up view.
  const tradesByMonth = useMemo(() => {
    const map = new Map<
      string,
      { netPL: number; closedCount: number; hasOpen: boolean; total: number }
    >();
    if (!trades) return map;
    for (const t of trades) {
      const isClosed = t.status === "WIN" || t.status === "LOSS";
      // Closed trades count under the month they were exited; open trades
      // under the month they were entered.
      const dateStr = isClosed && t.dateClosed ? t.dateClosed : t.dateBought;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const prev = map.get(key) ?? {
        netPL: 0,
        closedCount: 0,
        hasOpen: false,
        total: 0,
      };
      prev.total += 1;
      if (isClosed) {
        prev.netPL += tradeNetPL(t);
        prev.closedCount += 1;
      } else if (t.status === "OPEN") {
        prev.hasOpen = true;
      }
      map.set(key, prev);
    }
    return map;
  }, [trades]);

  // Net P/L + counts for the Mon-Fri window starting at weekStart.
  // Buckets on the same exit/entry-date rule as the rest of the page.
  const getWeekSummary = (weekStart: Date) => {
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(addDays(weekStart, 4), "yyyy-MM-dd");
    let netPL = 0;
    let closedCount = 0;
    let hasOpen = false;
    let total = 0;
    for (const t of trades ?? []) {
      const isClosed = t.status === "WIN" || t.status === "LOSS";
      const dayStr =
        isClosed && t.dateClosed
          ? t.dateClosed.split("T")[0]
          : t.dateBought.split("T")[0];
      if (dayStr < startStr || dayStr > endStr) continue;
      total += 1;
      if (isClosed) {
        netPL += tradeNetPL(t);
        closedCount += 1;
      } else if (t.status === "OPEN") {
        hasOpen = true;
      }
    }
    return { netPL, closedCount, hasOpen, total };
  };

  const getMonthSummary = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return (
      tradesByMonth.get(key) ?? {
        netPL: 0,
        closedCount: 0,
        hasOpen: false,
        total: 0,
      }
    );
  };

  return (
    <>
      {/* Aurora - matches the dashboard / trades / settings hue. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      {/* Mobile height clamps the wrapper between the floating brand
          row up top (~60px incl. mt-15) and the floating bottom tab
          bar (88px + safe-area). md:h-auto on desktop where there's
          no bottom nav. */}
      <div className="flex md:mt-24 md:mb-10 justify-center mt-15 md:h-auto h-[calc(100dvh-60px-88px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:w-auto w-full">
        <div className="flex md:h-auto h-full md:w-auto w-full">
          {/* Width matches the desktop navbar exactly:
              max-w-[1500px] + mx-10 (80px total horizontal margin) so
              the calendar pill sits directly beneath the nav pill at
              the same width. mt-22 places it ~12px under the nav. */}
          <div className="md:max-w-[1500px] md:w-[calc(100vw-80px)] w-full md:h-auto h-full flex flex-col mx-auto">
            {/* Unified control row - month P/L on the left, Today +
                Month/Week toggle on the right. */}
            <div className="flex items-center justify-between gap-2 px-3 md:px-0 mb-3 md:mb-4">
              {(() => {
                const isWeek = view === "week";
                const summary = isWeek
                  ? getWeekSummary(displayedWeekStart)
                  : getMonthSummary(displayedMonth);
                const label = isWeek
                  ? `${format(displayedWeekStart, "MMM d")} – ${format(
                      addDays(displayedWeekStart, 4),
                      "MMM d",
                    )}`
                  : `${displayedMonth.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}`;
                const positive = summary.netPL >= 0;
                return (
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
                      {label}
                    </div>
                    <div
                      className={`text-lg md:text-2xl font-semibold tracking-tight tabular-nums ${
                        summary.closedCount === 0
                          ? "text-white/40"
                          : positive
                            ? "text-green-300"
                            : "text-red-300"
                      }`}
                    >
                      {summary.closedCount === 0
                        ? "-"
                        : `${positive ? "" : "-"}${fmtMoneyCompact(Math.abs(summary.netPL))}`}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/75 hover:text-white transition text-[12px] font-medium cursor-pointer"
                  title="Jump to today"
                >
                  <i className="fa-regular fa-calendar text-[10px]" />
                  Today
                </button>
                <div className="relative inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                  <span
                    aria-hidden
                    className={`absolute top-1 bottom-1 rounded-full bg-white/10 border border-white/15 transition-[left,width] duration-300 ease-out ${
                      view === "month"
                        ? "left-1 w-[calc(50%-4px)]"
                        : "left-[calc(50%)] w-[calc(50%-4px)]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setView("month")}
                    className={`relative px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                      view === "month"
                        ? "text-white"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("week")}
                    className={`relative px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                      view === "week"
                        ? "text-white"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>
            </div>

            {view === "month" ? (
              <div className="flex gap-3 items-stretch md:flex-initial flex-1 md:h-auto min-h-0">
                <div
                  ref={calendarColRef}
                  className="flex-1 min-w-0 relative md:h-auto h-full"
                >
                  <AnimatedCalendar
                    ref={calRef}
                    value={value}
                    onChange={(date) => handleDateClick(date)}
                    tileContent={renderTileContent}
                    tileClassName={renderTileClassName}
                    className="custom-calendar_full-view"
                    showTodayButton={false}
                    onMonthChange={setDisplayedMonth}
                    onViewChange={setCalView}
                  />
                </div>
                {/* Sidebar - empty spacer at top sized to the calendar's
                    nav+weekday height so each week card lines up with
                    its day-grid row. Hidden in drill-up views. */}
                <div
                  className={`w-44 shrink-0 flex-col ${
                    calView === "month" ? "hidden md:flex" : "hidden"
                  }`}
                >
                  <div
                    style={{ height: sidebarOffset, minHeight: 40 }}
                    className="pb-2"
                  />
                  <div
                    className="grid"
                    style={{
                      gridTemplateRows:
                        sidebarRows || "repeat(6, minmax(110px, 1fr))",
                      rowGap: 4,
                    }}
                  >
                    {weekSummaries.map((w) => (
                      <WeekSummary
                        key={w.weekNum}
                        weekNum={w.weekNum}
                        netPL={w.netPL}
                        tradeCount={w.tradeCount}
                        daysWithTrades={w.daysWithTrades}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative md:h-auto h-full">
                <WeekView
                  ref={calRef}
                  value={value}
                  trades={trades}
                  onDateClick={(date) => handleDateClick(date)}
                  onEventClick={(event) => {
                    setSelectedDate(new Date(event.dateBought));
                    setEditingTrade(event);
                    setIsModalOpen(true);
                  }}
                  onWeekChange={setDisplayedWeekStart}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {dayListOpen && selectedDate && (
        <DayTradesModal
          date={selectedDate}
          trades={tradesForSelectedDay}
          onClose={() => setDayListOpen(false)}
          onAddTrade={() => {
            setDayListOpen(false);
            setEditingTrade(null);
            setIsModalOpen(true);
          }}
          onTradeClick={(trade) => {
            setDayListOpen(false);
            setEditingTrade(trade);
            setIsModalOpen(true);
          }}
        />
      )}

      <AnimatePresence>
        {isModalOpen && selectedDate && (
          <TradeModal
            key="trade-modal"
            date={
              editingTrade?.dateBought
                ? new Date(editingTrade.dateBought)
                : selectedDate
            }
            onClose={() => {
              setIsModalOpen(false);
              setEditingTrade(null);
            }}
            onSave={handleSaveTrade}
            initialTrade={editingTrade ?? undefined}
            onDelete={handleDeleteTrade}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default withAuth(Page);
