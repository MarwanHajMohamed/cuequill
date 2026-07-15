"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import {
  format,
  addDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import "react-calendar/dist/Calendar.css";
import "./calendar-custom.css";
import DayTradesModal from "../modals/DayTradesModal";
import TradeModal from "../modals/TradeModal";
import { Trade } from "@/app/types/Trades";
import { useTrades } from "@/hooks/useTrades";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import { handleSaveTrade, handleDeleteTrade } from "@/handlers/tradeHandlers";
import { useFedDates } from "@/hooks/useFedDates";
import { useMarketHolidays } from "@/hooks/useMarketHolidays";
import AnimatedCalendar from "@/app/reusablecalendar/AnimatedCalendar";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/Loaders";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
const now = new Date();
const today = now.toISOString().split("T")[0];

// Week-summary card for the calendar sidebar (desktop only). Mirrors the
// card on the full calendar page so the dashboard reads the same way.
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
    <div className="border border-white/10 rounded-lg p-3 flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <div className="text-xs text-white/60">Week {weekNum}</div>
        {hasTrades && (
          <div className="text-[10px] text-white/40 tracking-wide">Total</div>
        )}
      </div>
      {hasTrades ? (
        <>
          <div className="flex justify-between items-baseline gap-2">
            <div
              className={`text-lg font-normal ${
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

export default function TradeCalendar({ userId }: { userId: string }) {
  const value = new Date();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dayListOpen, setDayListOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const fedDates = useFedDates();
  const holidays = useMarketHolidays();

  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  // Track the month/view the calendar is showing so the week-summary
  // sidebar reflects the same view. Only meaningful for the day grid.
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => new Date());
  const [calView, setCalView] = useState<string>("month");

  // The sidebar lines each week card up with its calendar row. We measure
  // the day grid's offset + row template and mirror them onto the sidebar.
  const calendarColRef = useRef<HTMLDivElement>(null);
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const [sidebarRows, setSidebarRows] = useState<string>("");

  useLayoutEffect(() => {
    const measure = () => {
      if (!calendarColRef.current) return;
      const days = calendarColRef.current.querySelector(
        ".react-calendar__month-view__days",
      ) as HTMLElement | null;
      if (!days) return;
      const colRect = calendarColRef.current.getBoundingClientRect();
      const daysRect = days.getBoundingClientRect();
      setSidebarOffset(Math.max(0, daysRect.top - colRect.top));
      setSidebarRows(getComputedStyle(days).gridTemplateRows);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (calendarColRef.current) ro.observe(calendarColRef.current);
    const days = calendarColRef.current?.querySelector(
      ".react-calendar__month-view__days",
    );
    if (days) ro.observe(days);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [displayedMonth, calView, trades]);

  // Per-week summaries for the displayed month - buckets trades the same
  // way the calendar tiles do so totals match what each day shows.
  const weekSummaries = useMemo(() => {
    const monthStart = startOfMonth(displayedMonth);
    const monthEnd = endOfMonth(displayedMonth);
    const monthStartStr = format(monthStart, "yyyy-MM-dd");
    const monthEndStr = format(monthEnd, "yyyy-MM-dd");

    const buckets: {
      weekNum: number;
      tradeCount: number;
      netPL: number;
      daysWithTrades: number;
    }[] = [];
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

  const router = useRouter();

  // Closed trades count under their EXIT date (matches broker P/L
  // attribution). Open trades stay under their entry date.
  const bucketDateFor = (t: Trade) => {
    const isClosed = t.status === "WIN" || t.status === "LOSS";
    return isClosed && t.dateClosed
      ? t.dateClosed.split("T")[0]
      : t.dateBought.split("T")[0];
  };

  const tradesByDay = useMemo(() => {
    const map = new Map<
      string,
      { netPL: number; closedCount: number; hasOpen: boolean; total: number }
    >();
    if (!trades) return map;
    for (const t of trades) {
      const day = bucketDateFor(t);
      const prev = map.get(day) ?? {
        netPL: 0,
        closedCount: 0,
        hasOpen: false,
        total: 0,
      };
      prev.total += 1;
      if (t.status === "WIN" || t.status === "LOSS") {
        prev.netPL += tradeNetPL(t);
        prev.closedCount += 1;
      } else if (t.status === "OPEN") {
        prev.hasOpen = true;
      }
      map.set(day, prev);
    }
    return map;
  }, [trades]);

  // Per-month aggregation (keyed "yyyy-MM") for the year drill-up view.
  const tradesByMonth = useMemo(() => {
    const map = new Map<
      string,
      { netPL: number; closedCount: number; hasOpen: boolean; total: number }
    >();
    if (!trades) return map;
    for (const t of trades) {
      const isClosed = t.status === "WIN" || t.status === "LOSS";
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

  // Per-year aggregates for the decade (years) drill-up view.
  const tradesByYear = useMemo(() => {
    const map = new Map<
      number,
      { netPL: number; closedCount: number; hasOpen: boolean; total: number }
    >();
    if (!trades) return map;
    for (const t of trades) {
      const isClosed = t.status === "WIN" || t.status === "LOSS";
      const dateStr = isClosed && t.dateClosed ? t.dateClosed : t.dateBought;
      const y = new Date(dateStr).getFullYear();
      const prev = map.get(y) ?? {
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
      map.set(y, prev);
    }
    return map;
  }, [trades]);

  const getYearSummary = (date: Date) =>
    tradesByYear.get(date.getFullYear()) ?? {
      netPL: 0,
      closedCount: 0,
      hasOpen: false,
      total: 0,
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

  const getDaySummary = (date: Date) => {
    const dayStr = format(date, "yyyy-MM-dd");
    const summary = tradesByDay.get(dayStr) ?? {
      netPL: 0,
      closedCount: 0,
      hasOpen: false,
      total: 0,
    };
    return {
      ...summary,
      isToday: dayStr === today,
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
              className={`font-normal ${
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

    // Decade drill-up view: each tile is a year - show yearly P/L + count.
    if (view === "decade") {
      const { total, closedCount, netPL } = getYearSummary(date);
      if (total === 0) return null;
      return (
        <div className="mt-1 flex flex-col items-center gap-0.5 text-[10px] md:text-xs">
          {closedCount > 0 ? (
            <div
              className={`font-normal ${
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

    // Day badges only belong on the month grid.
    if (view !== "month") return null;

    const { total, closedCount, netPL, isToday, isFed, marketDay } =
      getDaySummary(date);
    if (total === 0 && !isToday && !isFed && !marketDay) return null;

    return (
      <>
        {isFed && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/35 text-purple-100 border border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.35)] text-[9px] md:text-[10px] font-bold tracking-wide leading-none">
            <span className="w-1 h-1 rounded-full bg-purple-200" aria-hidden />
            Fed
          </span>
        )}
        {marketDay &&
          (marketDay.early ? (
            <span
              title={`early close 1:00pm ET — ${marketDay.name}`}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/35 text-sky-100 border border-sky-400/60 shadow-[0_0_8px_rgba(56,189,248,0.35)] text-[9px] md:text-[10px] font-bold tracking-wide leading-none"
            >
              <i className="fa-solid fa-clock text-[8px]" aria-hidden />
              1pm
            </span>
          ) : (
            <span
              title={`market closed — ${marketDay.name}`}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/35 text-amber-100 border border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.4)] text-[9px] md:text-[10px] font-bold tracking-wide leading-none"
            >
              <i className="fa-solid fa-lock text-[8px]" aria-hidden />
              Closed
            </span>
          ))}
        <div className="mt-1 flex flex-col items-center gap-0.5 text-[10px] md:text-xs">
          {isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          {total > 0 && (
            <>
              {closedCount > 0 ? (
                <div
                  className={`font-normal ${
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
            </>
          )}
        </div>
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
    if (view === "decade") {
      const { closedCount, netPL, hasOpen } = getYearSummary(date);
      if (closedCount > 0) return netPL >= 0 ? "day-win" : "day-loss";
      if (hasOpen) return "day-open";
      return "";
    }
    if (view !== "month") return "";
    const { closedCount, netPL, hasOpen } = getDaySummary(date);
    if (closedCount > 0) return netPL >= 0 ? "day-win" : "day-loss";
    if (hasOpen) return "day-open";
    return "";
  };

  if (isLoading)
    return (
      <div className="w-full max-w-[1600px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-[320px] rounded-2xl" delay={0.05} />
      </div>
    );
  if (isError)
    return (
      <div className="w-full max-w-[1600px] mx-auto px-5 md:px-10">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4 text-sm text-red-300">
          Couldn&apos;t load calendar data.
        </div>
      </div>
    );

  return (
    <>
      <div className="w-full max-w-[1600px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between gap-2"></div>
        <div className="flex gap-3 items-stretch">
          <div
            ref={calendarColRef}
            className="flex-1 min-w-0 relative rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-5"
          >
            <AnimatedCalendar
                onChange={(val) => handleDateClick(val as Date)}
                tileContent={renderTileContent}
                tileClassName={renderTileClassName}
                className="custom-calendar"
                value={value}
                onMonthChange={setDisplayedMonth}
                onViewChange={setCalView}
              />
            </div>
            {/* Sidebar - empty spacer at top sized to the calendar's
                nav+weekday height so each week card lines up with its
                day-grid row. Hidden in drill-up views and on mobile. */}
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
            // Keep the day-list open behind the trade view so the
            // chevron in ViewTradeModal can return to it.
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
            // Close the whole stack — trade view AND the day-list
            // parent. Back chevron below returns to the day list
            // instead.
            onClose={() => {
              setIsModalOpen(false);
              setEditingTrade(null);
              setDayListOpen(false);
            }}
            onSave={(e) =>
              handleSaveTrade(e, userId, setIsModalOpen, queryClient)
            }
            onDelete={(tradeId) =>
              handleDeleteTrade(
                tradeId,
                userId,
                setIsModalOpen,
                setEditingTrade,
                queryClient,
              )
            }
            initialTrade={editingTrade ?? undefined}
            onBack={
              dayListOpen
                ? () => {
                    setIsModalOpen(false);
                    setEditingTrade(null);
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}
