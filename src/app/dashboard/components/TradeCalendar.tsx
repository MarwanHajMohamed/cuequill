"use client";

import React, { useEffect, useState } from "react";
import Calendar, { CalendarType } from "react-calendar";
import { format, isToday } from "date-fns";
import "react-calendar/dist/Calendar.css";
import "./calendar-custom.css";
import TradeModal from "./TradeModal";

type TradeEventType = "win" | "loss" | "pending" | "today";

type TradeEvent = {
  date: string;
  label?: string;
  type: TradeEventType;
};

type Trade = {
  _id: string;
  dateBought: string;
  expiryDate: string;
  status: "OPEN" | "WIN" | "LOSS";
  type: "CALL" | "PUT";
};

const now = new Date();
const today = now.toISOString().split("T")[0];

const initialTradeEvents: TradeEvent[] = [{ date: today, type: "today" }];

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
  const [value, setValue] = useState<Date | null>(new Date());

  useEffect(() => {
    async function fetchTrades() {
      const res = await fetch(`/api/trades?userId=${userId}`);
      const data: Trade[] = await res.json();

      const mappedEvents: TradeEvent[] = data.map((trade) => ({
        date: trade.dateBought.split("T")[0],
        type:
          trade.status === "OPEN"
            ? "pending"
            : trade.status === "WIN"
            ? "win"
            : "loss",
      }));

      setTradeEvents([{ date: today, type: "today" }, ...mappedEvents]);
      console.log(data);
    }

    fetchTrades();
  }, [userId]);

  const [tradeEvents, setTradeEvents] =
    useState<TradeEvent[]>(initialTradeEvents);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSaveTrade = (newTrade: TradeEvent) => {
    setTradeEvents((prev) => [...prev, newTrade]);
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

  return (
    <div className="bg-[#0F0F17] flex items-center justify-center p-20">
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
