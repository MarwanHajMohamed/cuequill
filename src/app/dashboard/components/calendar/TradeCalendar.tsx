"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { fetchMeetings } from "@/hooks/useFed";
import { FedMeetingsResponse } from "@/app/types/FedMeeting";

type TradeEventType = "WIN" | "LOSS" | "OPEN" | "TODAY" | "FED";

type TradeEvent = {
  date: string;
  label?: string;
  status: TradeEventType;
};

type FedMeetingPayload = {
  meetingDt: string;
  offsetDayCount: number;
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
    case "FED":
      return "bg-purple-500";
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
  const [fedMeetings, setFedMeetings] = useState<TradeEvent[]>([]);

  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data: FedMeetingsResponse = await fetchMeetings();
        const meetingEvents: TradeEvent[] = data.payload.map(
          (m: FedMeetingPayload) => ({
            date: m.meetingDt,
            status: "FED",
            offsetDayCount: m.offsetDayCount,
          })
        );
        setFedMeetings(meetingEvents);
      } catch (err) {
        console.error(
          err instanceof Error ? err.message : "Error fetching Fed meetings"
        );
      }
    }

    load();
  }, []);

  const tradeEvents: TradeEvent[] = useMemo(() => {
    const baseEvents: TradeEvent[] = trades
      ? trades.map((trade) => ({
          date: trade.dateBought.split("T")[0],
          status: trade.status,
        }))
      : [];

    return [
      { date: today, status: "TODAY" },
      ...baseEvents,
      ...manualTrades,
      ...fedMeetings,
    ];
  }, [trades, manualTrades, fedMeetings]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
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
    <div className="flex flex-col-reverse md:flex-row items-center md:items-start justify-center py-10 px-20 w-[100%] gap-3 relative">
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
      <div className="flex flex-col items-center md:items-start md:gap-2 gap-5">
        <div>Key</div>
        <div className="flex md:flex-col gap-8 md:gap-2 mb-10 text-xs md:text-base">
          <div className="flex gap-2 items-center flex-col md:flex-row">
            <div className="w-[15px] h-[15px] bg-blue-600 rounded-full"></div>
            <div>Today</div>
          </div>
          <div className="flex gap-2 items-center flex-col md:flex-row">
            <div className="w-[15px] h-[15px] bg-green-500 rounded-full"></div>
            <div>Won</div>
          </div>
          <div className="flex gap-2 items-center flex-col md:flex-row">
            <div className="w-[15px] h-[15px] bg-red-700 rounded-full"></div>
            <div>Lost</div>
          </div>
          <div className="flex gap-2 items-center flex-col md:flex-row">
            <div className="w-[15px] h-[15px] bg-orange-500 rounded-full"></div>
            <div>Open</div>
          </div>
          <div className="flex gap-2 items-center flex-col md:flex-row">
            <div className="w-[15px] h-[15px] bg-purple-500 rounded-full"></div>
            <div>Fed</div>
          </div>
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
