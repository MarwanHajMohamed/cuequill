"use client";

import React, { useState, useMemo } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import "react-calendar/dist/Calendar.css";
import "./calendar-custom.css";
import TradeModal from "./TradeModal";
import { useTrades } from "@/hooks/useTrades";
import { useQueryClient } from "@tanstack/react-query";

type TradeEventType = "win" | "loss" | "pending" | "today";

type TradeEvent = {
  date: string;
  label?: string;
  type: TradeEventType;
};

const now = new Date();
const today = now.toISOString().split("T")[0];

const getColor = (type: TradeEventType) => {
  switch (type) {
    case "today":
      return "bg-blue-500";
    case "win":
      return "bg-green-500";
    case "loss":
      return "bg-red-600";
    case "pending":
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
  const [manualTrades, setManualTrades] = useState<TradeEvent[]>([]);

  const { data: trades, isLoading, isError } = useTrades(userId);

  const tradeEvents: TradeEvent[] = useMemo(() => {
    const baseEvents: TradeEvent[] = trades
      ? trades.map((trade) => ({
          date: trade.dateBought.split("T")[0],
          type:
            trade.status === "OPEN"
              ? "pending"
              : trade.status === "WIN"
              ? "win"
              : "loss",
        }))
      : [];

    return [{ date: today, type: "today" }, ...baseEvents, ...manualTrades];
  }, [trades, manualTrades]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSaveTrade = async (newTrade: TradeEvent) => {
    const response = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTrade, userId }),
    });

    if (!response.ok) {
      console.error("Failed to save trade");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["trades", userId] });

    setIsModalOpen(false);
  };

  const renderTileContent = ({ date }: { date: Date }) => {
    const dayStr = format(date, "yyyy-MM-dd");
    const eventsForDay = tradeEvents.filter((e) => e.date === dayStr);

    if (eventsForDay.length > 0) {
      return (
        <div className="mt-1 flex gap-1 justify-center items-center">
          {eventsForDay.map((event, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${getColor(event.type)}`}
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
    <div className="flex items-center justify-center p-20 w-[100%] max-w-400">
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
      {isModalOpen && selectedDate && (
        <TradeModal
          date={selectedDate}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTrade}
        />
      )}
    </div>
  );
}
