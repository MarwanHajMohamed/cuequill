"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import "react-calendar/dist/Calendar.css";
import "./calendar-custom.css";
import DayTradesModal from "../modals/DayTradesModal";
import TradeModal from "../modals/TradeModal";
import { Trade } from "@/app/types/Trades";
import { useTrades } from "@/hooks/useTrades";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import { handleSaveTrade } from "@/handlers/tradeHandlers";
import { useFedDates } from "@/hooks/useFedDates";
import { useMarketHolidays } from "@/hooks/useMarketHolidays";
import AnimatedCalendar from "@/app/reusablecalendar/AnimatedCalendar";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/Loaders";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
const now = new Date();
const today = now.toISOString().split("T")[0];

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
      const dateStr =
        isClosed && t.dateClosed ? t.dateClosed : t.dateBought;
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayStr = format(date, "yyyy-MM-dd");
    const dayTrades =
      trades?.filter((t) => bucketDateFor(t) === dayStr) ?? [];
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

  const renderTileContent = ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => {
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

    const { total, closedCount, netPL, isToday, isFed, marketDay } =
      getDaySummary(date);
    if (total === 0 && !isToday && !isFed && !marketDay) return null;

    return (
      <>
        {isFed && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[8px] md:text-[9px] font-semibold uppercase tracking-wide leading-none">
            Fed
          </span>
        )}
        {marketDay &&
          (marketDay.early ? (
            <span
              title={`Early close 1:00pm ET — ${marketDay.name}`}
              className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[8px] md:text-[9px] font-semibold uppercase tracking-wide leading-none"
            >
              1pm
            </span>
          ) : (
            <span
              title={`Market closed — ${marketDay.name}`}
              className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[8px] md:text-[9px] font-semibold uppercase tracking-wide leading-none"
            >
              Closed
            </span>
          ))}
        <div className="mt-1 flex flex-col items-center gap-0.5 text-[10px] md:text-xs">
          {isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          {total > 0 && (
            <>
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
    const { closedCount, netPL, hasOpen } = getDaySummary(date);
    if (closedCount > 0) return netPL >= 0 ? "day-win" : "day-loss";
    if (hasOpen) return "day-open";
    return "";
  };

  if (isLoading)
    return (
      <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-[320px] rounded-2xl" delay={0.05} />
      </div>
    );
  if (isError)
    return (
      <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4 text-sm text-red-300">
          Couldn&apos;t load calendar data.
        </div>
      </div>
    );

  return (
    <>
      <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="md:text-xl text-sm font-bold">Calendar</h2>
          <button
            onClick={() => router.push("/calendar")}
            className="text-xs text-white/60 hover:text-white flex items-center gap-1 transition cursor-pointer"
            aria-label="Open full calendar"
          >
            Full view
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-5">
          <AnimatedCalendar
            onChange={(val) => handleDateClick(val as Date)}
            tileContent={renderTileContent}
            tileClassName={renderTileClassName}
            className="custom-calendar"
            value={value}
          />
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
            onSave={(e) =>
              handleSaveTrade(e, userId, setIsModalOpen, queryClient)
            }
            initialTrade={editingTrade ?? undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
}
