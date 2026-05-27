"use client";

import "./custom-calendar.css";
import { useFedDates } from "@/hooks/useFedDates";
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
    <div className="border border-[#282828] rounded-lg p-3 flex flex-col gap-1.5">
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
              {netPL >= 0 ? "+" : "−"}${Math.abs(netPL).toFixed(2)}
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

  // Shared ref — either AnimatedCalendar or WeekView is mounted at a time
  // and both expose a goToToday() via useImperativeHandle.
  const calRef = useRef<{ goToToday: () => void } | null>(null);
  const goToToday = () => calRef.current?.goToToday();

  // Track which month the AnimatedCalendar is showing, so the week-summary
  // sidebar can reflect the same view.
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => new Date());

  const calendarColRef = useRef<HTMLDivElement>(null);
  const [sidebarOffset, setSidebarOffset] = useState(0);

  const manualTrades: Trade[] = useMemo<Trade[]>(() => [], []);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const { data: trades } = useTrades(userId, simulated);
  const fedDates = useFedDates();

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
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(calendarColRef.current!);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [view, displayedMonth, trades]);

  const tradeEvents: TradeEvent[] = useMemo(() => {
    const baseEvents: TradeEvent[] = trades
      ? trades.map((trade) => ({
          _id: trade._id,
          date: trade.dateBought.split("T")[0],
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
          favourite: trade.favourite,
        }))
      : [];

    return [{ date: today, status: "TODAY" }, ...baseEvents, ...manualTrades];
  }, [trades, manualTrades]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayStr = format(date, "yyyy-MM-dd");
    const dayTrades =
      trades?.filter((t) => t.dateBought.split("T")[0] === dayStr) ?? [];
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
    return trades.filter((t) => t.dateBought.split("T")[0] === dayStr);
  }, [selectedDate, trades]);

  // Per-week summaries for the displayed month — used by the sidebar.
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
        const dayStr = t.dateBought.split("T")[0];
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
      const netPL = closed.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0);
      const days = new Set(inWeek.map((t) => t.dateBought.split("T")[0]));
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
    const netPL = closedEvts.reduce((sum, e) => sum + (e.profitLoss ?? 0), 0);
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
    };
  };

  const renderTileContent = ({ date, view }: { date: Date; view: string }) => {
    // Year drill-up view: each tile is a month — show monthly P/L + count.
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
              {netPL >= 0 ? "+" : "−"}${Math.abs(netPL).toFixed(2)}
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
    } = getDaySummary(date);
    if (tradeCount === 0 && !isToday && !isFed) return null;

    return (
      <>
        {isFed && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[8px] md:text-[9px] font-semibold uppercase tracking-wide leading-none">
            Fed
          </span>
        )}
        {isToday && (
          <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
        )}
        {/* Bottom-left: P/L + trade count */}
        {tradeCount > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-col items-start gap-0.5 text-[10px] md:text-xs">
            {closedCount > 0 ? (
              <div
                className={`font-semibold ${
                  netPL >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {netPL >= 0 ? "+" : "−"}${Math.abs(netPL).toFixed(2)}
              </div>
            ) : (
              <div className="font-semibold text-orange-400">Open</div>
            )}
            <div className="text-white/40 text-[9px] md:text-[10px]">
              {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
            </div>
          </div>
        )}
        {/* Bottom-right: W/L mini bars — fixed total width, segment width
            proportional to its count (2 wins = 2× as wide as 1 loss). */}
        {(winCount > 0 || lossCount > 0) && (
          <div
            className="absolute bottom-2 right-2 flex items-end gap-1"
            style={{ width: 56 }}
          >
            {lossCount > 0 && (
              <div
                className="flex flex-col items-center gap-0.5"
                style={{ flex: lossCount }}
              >
                <div className="w-full h-2 bg-red-500 rounded-sm" />
                <div className="text-[10px] md:text-xs text-red-400 leading-none">
                  {lossCount}
                </div>
              </div>
            )}
            {winCount > 0 && (
              <div
                className="flex flex-col items-center gap-0.5"
                style={{ flex: winCount }}
              >
                <div className="w-full h-2 bg-green-500 rounded-sm" />
                <div className="text-[10px] md:text-xs text-green-400 leading-none">
                  {winCount}
                </div>
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
      const d = new Date(t.dateBought);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const prev = map.get(key) ?? {
        netPL: 0,
        closedCount: 0,
        hasOpen: false,
        total: 0,
      };
      prev.total += 1;
      if (t.status === "WIN" || t.status === "LOSS") {
        prev.netPL += t.profitLoss ?? 0;
        prev.closedCount += 1;
      } else if (t.status === "OPEN") {
        prev.hasOpen = true;
      }
      map.set(key, prev);
    }
    return map;
  }, [trades]);

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
      <div className="flex md:mt-27 mb-10 justify-center mt-23">
        <div className="flex">
          <div className="md:max-w-350 md:w-[90vw] w-[95vw]">
            {/* Button row: always visible on mobile; on desktop, only shown
                in week view (in month view the buttons live in the sidebar
                above the Week 1 card). */}
            <div
              className={`flex mb-4 justify-end items-center gap-2 ${
                view === "month" ? "md:hidden" : ""
              }`}
            >
              <button
                onClick={goToToday}
                className="px-2 py-1 text-sm rounded border border-white/10 cursor-pointer transition duration-100 hover:bg-white/5 text-white/70 hover:text-white"
              >
                Today
              </button>
              <div>
                <button
                  className={`px-2 py-1 text-sm rounded-l cursor-pointer transition
                duration-100 hover:bg-[#211F29] border border-white/10 border-r-0 ${
                  view === "month"
                    ? "bg-[#16151C] hover:bg-[#16151C]"
                    : "bg-[#242329]"
                }`}
                  onClick={() => setView("month")}
                >
                  Month
                </button>
                <button
                  className={`px-2 py-1 text-sm rounded-r cursor-pointer transition
                duration-100 hover:bg-[#211F29] border border-white/10 border-l-0 ${
                  view === "week"
                    ? "bg-[#16151C] hover:bg-[#16151C]"
                    : "bg-[#242329]"
                }`}
                  onClick={() => setView("week")}
                >
                  Week
                </button>
              </div>
            </div>

            {view === "month" ? (
              <div className="flex gap-3 items-stretch">
                <div ref={calendarColRef} className="flex-1 min-w-0">
                  <AnimatedCalendar
                    ref={calRef}
                    value={value}
                    onChange={(date) => handleDateClick(date)}
                    tileContent={renderTileContent}
                    tileClassName={renderTileClassName}
                    className="custom-calendar_full-view"
                    showTodayButton={false}
                    onMonthChange={setDisplayedMonth}
                  />
                </div>
                {/* Sidebar: header area (Today + Month/Week buttons) sized
                    to match the calendar's nav+weekday height, then a grid
                    of week cards using the same row spec as the calendar's
                    day grid so each card lines up with its week row. */}
                <div className="hidden md:flex w-44 shrink-0 flex-col">
                  <div
                    className="flex justify-end items-end gap-2 pb-2"
                    style={{ height: sidebarOffset, minHeight: 40 }}
                  >
                    <button
                      onClick={goToToday}
                      className="shrink-0 px-2 py-1 text-sm rounded border border-white/10 cursor-pointer transition duration-100 hover:bg-white/5 text-white/70 hover:text-white"
                    >
                      Today
                    </button>
                    <div className="flex shrink-0">
                      <button
                        className={`px-2 py-1 text-sm rounded-l cursor-pointer transition
                      duration-100 hover:bg-[#211F29] border border-white/10 border-r-0 ${
                        view === "month"
                          ? "bg-[#16151C] hover:bg-[#16151C]"
                          : "bg-[#242329]"
                      }`}
                        onClick={() => setView("month")}
                      >
                        Month
                      </button>
                      <button
                        className="px-2 py-1 text-sm rounded-r cursor-pointer transition
                      duration-100 hover:bg-[#211F29] border border-white/10 border-l-0 bg-[#242329]"
                        onClick={() => setView("week")}
                      >
                        Week
                      </button>
                    </div>
                  </div>
                  <div
                    className="grid"
                    style={{
                      gridAutoRows: "minmax(110px, 1fr)",
                      rowGap: 0,
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
              />
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

      {isModalOpen && selectedDate && (
        <TradeModal
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
    </>
  );
}

export default withAuth(Page);
