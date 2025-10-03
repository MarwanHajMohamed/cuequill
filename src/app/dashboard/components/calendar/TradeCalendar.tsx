"use client";

import React, { useState, useMemo } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import "react-calendar/dist/Calendar.css";
import "./calendar-custom.css";
import TradeModal from "../modals/EditTradeModal";
import { useTrades } from "@/hooks/useTrades";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import { handleSaveTrade } from "@/handlers/tradeHandlers";

type TradeEventType = "WIN" | "LOSS" | "OPEN" | "TODAY";

type TradeEvent = {
  date: string;
  label?: string;
  status: TradeEventType;
};

const now = new Date();
const today = now.toISOString().split("T")[0];

const getColor = (status: TradeEventType) => {
  switch (status) {
    case "TODAY":
      return "bg-blue-500";
    case "WIN":
      return "bg-green-500";
    case "LOSS":
      return "bg-red-600";
    case "OPEN":
      return "bg-orange-400";
    default:
      return "";
  }
};

export default function TradeCalendar({ userId }: { userId: string }) {
  const value = new Date();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const manualTrades: TradeEvent[] = useMemo<TradeEvent[]>(() => [], []);

  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  const router = useRouter();

  const tradeEvents: TradeEvent[] = useMemo(() => {
    const baseEvents: TradeEvent[] = trades
      ? trades.map((trade) => ({
          date: trade.dateBought.split("T")[0],
          status: trade.status,
        }))
      : [];

    return [{ date: today, status: "TODAY" }, ...baseEvents, ...manualTrades];
  }, [trades, manualTrades]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  // const handleSaveTrade = async (newTrade: TradeEvent) => {
  //   const { ...rest } = newTrade;

  //   const response = await fetch("/api/trades", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ ...rest, userId }),
  //   });

  //   if (!response.ok) {
  //     console.error("Failed to save trade");
  //     return;
  //   }

  //   queryClient.invalidateQueries({ queryKey: ["trades", userId] });

  //   setIsModalOpen(false);
  // };

  const renderTileContent = ({ date }: { date: Date }) => {
    const dayStr = format(date, "yyyy-MM-dd");
    const eventsForDay = tradeEvents.filter((e) => e.date === dayStr);

    if (eventsForDay.length > 0) {
      return (
        <div className="mt-1 flex gap-1 justify-center items-center">
          {eventsForDay.map((event, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${getColor(event.status)}`}
              title={event.label}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  if (isLoading)
    return <div className="text-white p-10">Loading trades...</div>;
  if (isError)
    return <div className="text-red-500 p-10">Error loading trades</div>;

  return (
    <div className="flex justify-center py-10 px-20 w-[100%] gap-3 relative">
      <div className="relative">
        <div className="absolute top-[-30px] right-0 flex items-center gap-2">
          <i
            className="fa-solid fa-expand cursor-pointer transition duration-100 hover:scale-110"
            onClick={() => router.push("/calendar")}
          ></i>
        </div>
        <Calendar
          onChange={(val) => handleDateClick(val as Date)}
          value={value}
          tileContent={renderTileContent}
          formatShortWeekday={(locale, date) => format(date, "EEE")}
          formatMonthYear={(locale, date) => format(date, "LLLL yyyy")}
          next2Label={null}
          prev2Label={null}
          className="custom-calendar"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div>Key</div>
        <div className="flex gap-2 items-center">
          <div className="w-[15px] h-[15px] bg-blue-600 rounded-full"></div>
          <div>Today</div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-[15px] h-[15px] bg-green-500 rounded-full"></div>
          <div>Won Position</div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-[15px] h-[15px] bg-red-700 rounded-full"></div>
          <div>Lost Position</div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-[15px] h-[15px] bg-orange-500 rounded-full"></div>
          <div>Open Position</div>
        </div>
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
