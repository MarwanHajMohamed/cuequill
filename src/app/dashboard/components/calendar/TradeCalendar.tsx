"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import "react-calendar/dist/Calendar.css";
import "./calendar-custom.css";
import TradeModal from "../modals/EditTradeModal";
import { useTrades } from "@/hooks/useTrades";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import { handleSaveTrade } from "@/handlers/tradeHandlers";
import { fetchMeetings } from "@/hooks/useFed";
import { FedMeetingsResponse } from "@/app/types/FedMeeting";
import AnimatedCalendar from "@/app/reusablecalendar/AnimatedCalendar";

type FedMeetingPayload = {
  meetingDt: string;
  offsetDayCount: number;
};

const now = new Date();
const today = now.toISOString().split("T")[0];

export default function TradeCalendar({ userId }: { userId: string }) {
  const value = new Date();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fedDates, setFedDates] = useState<Set<string>>(new Set());

  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data: FedMeetingsResponse = await fetchMeetings();
        const dates = new Set(
          data.payload.map((m: FedMeetingPayload) => m.meetingDt)
        );
        setFedDates(dates);
      } catch (err) {
        console.error(
          err instanceof Error ? err.message : "Error fetching Fed meetings"
        );
      }
    }
    load();
  }, []);

  const tradesByDay = useMemo(() => {
    const map = new Map<
      string,
      { netPL: number; closedCount: number; hasOpen: boolean; total: number }
    >();
    if (!trades) return map;
    for (const t of trades) {
      const day = t.dateBought.split("T")[0];
      const prev = map.get(day) ?? {
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
      map.set(day, prev);
    }
    return map;
  }, [trades]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

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
    };
  };

  const renderTileContent = ({ date }: { date: Date }) => {
    const { total, closedCount, netPL, isToday, isFed } = getDaySummary(date);
    if (total === 0 && !isToday && !isFed) return null;

    return (
      <div className="mt-1 flex flex-col items-center gap-0.5 text-[10px] md:text-xs relative">
        {isFed && (
          <span className="absolute -top-5 right-1 text-[8px] md:text-[9px] font-bold text-purple-400 leading-none">
            F
          </span>
        )}
        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        {total > 0 && (
          <>
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
          </>
        )}
      </div>
    );
  };

  const renderTileClassName = ({ date }: { date: Date }) => {
    const { closedCount, netPL, hasOpen } = getDaySummary(date);
    if (closedCount > 0) return netPL >= 0 ? "day-win" : "day-loss";
    if (hasOpen) return "day-open";
    return "";
  };

  if (isLoading)
    return <div className="text-white p-10">Loading trades...</div>;
  if (isError)
    return <div className="text-red-500 p-10">Error loading trades</div>;

  return (
    <div className="flex flex-col items-center py-10 px-4 md:px-10 w-full">
      <div className="relative w-full max-w-[1100px]">
        <div className="absolute top-[-30px] right-0 flex items-center gap-2 mx-2">
          <i
            className="fa-solid fa-expand cursor-pointer transition duration-100 hover:scale-110"
            onClick={() => router.push("/calendar")}
          ></i>
        </div>
        <AnimatedCalendar
          onChange={(val) => handleDateClick(val as Date)}
          tileContent={renderTileContent}
          tileClassName={renderTileClassName}
          className="custom-calendar"
          value={value}
        />
      </div>
      {isModalOpen && selectedDate && (
        <TradeModal
          date={selectedDate}
          onClose={() => setIsModalOpen(false)}
          onSave={(e) =>
            handleSaveTrade(e, userId, setIsModalOpen, queryClient)
          }
        />
      )}
    </div>
  );
}
