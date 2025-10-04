"use client";

import "./custom-calendar.css";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { format, startOfWeek, addDays, subWeeks, addWeeks } from "date-fns";
import { useSession } from "next-auth/react";
import React, { useMemo, useState } from "react";
import TradeModal from "../dashboard/components/modals/TradeModal";
import { useQueryClient } from "@tanstack/react-query";
import { Trade } from "../types/Trades";
import dynamic from "next/dynamic";
import { withAuth } from "@/lib/withAuth";
const Calendar = dynamic(() => import("react-calendar"), { ssr: false });

type TradeEventType = "WIN" | "LOSS" | "OPEN" | "TODAY";

type TradeEvent =
  | Trade
  | {
      date: string;
      status: "TODAY";
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

const getHoverColor = (status: TradeEventType) => {
  switch (status) {
    case "WIN":
      return "hover:bg-green-600";
    case "LOSS":
      return "hover:bg-red-700";
    case "OPEN":
      return "hover:bg-orange-500";
    default:
      return "";
  }
};

function Page() {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const value = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<"month" | "week">("month");
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(now, { weekStartsOn: 1 })
  );
  const manualTrades: Trade[] = useMemo<Trade[]>(() => [], []);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const { data: trades } = useTrades(userId, simulated);

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
    setIsModalOpen(true);
  };

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

  const renderTileContent = ({ date }: { date: Date }) => {
    const dayStr = format(date, "yyyy-MM-dd");
    const eventsForDay = tradeEvents.filter((e) => e.date === dayStr);

    if (eventsForDay.length > 0) {
      return (
        <div className="label mt-1 flex flex-col gap-1 justify-center items-center">
          {eventsForDay.map((event, idx) =>
            event.status === "TODAY" ? (
              <div key={idx} className={`w-2 h-2 rounded-full bg-blue-500`} />
            ) : (
              <div
                key={idx}
                className={`w-15 h-4 rounded-md transition duration-200 ${getColor(
                  event.status
                )} ${getHoverColor(event.status)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDate(new Date(event.dateBought));
                  setEditingTrade(event);
                  setIsModalOpen(true);
                }}
                onMouseEnter={(e) => e.stopPropagation()}
              >
                {event.symbol}
              </div>
            )
          )}
        </div>
      );
    }
    return null;
  };

  // Build week days for collapsed view
  const getWeekDays = () =>
    Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <>
      <div className="flex mt-30 justify-center">
        <div className="flex gap-10">
          <div className="flex flex-col gap-2">
            <div>Key</div>
            <div className="flex gap-2 items-center">
              <div className="w-[15px] h-[15px] bg-blue-600 rounded-full"></div>
              <div>Today</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-10 h-[15px] bg-green-500 rounded-full"></div>
              <div>Won Position</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-10 h-[15px] bg-red-700 rounded-full"></div>
              <div>Lost Position</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-10 h-[15px] bg-orange-500 rounded-full"></div>
              <div>Open Position</div>
            </div>
          </div>

          <div className="max-w-200 w-[70vw]">
            <div className="flex mb-4 justify-end">
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

            {view === "month" ? (
              <Calendar
                onChange={(val) => handleDateClick(val as Date)}
                value={value}
                tileContent={renderTileContent}
                formatShortWeekday={(locale, date) => format(date, "EEE")}
                formatMonthYear={(locale, date) => format(date, "LLLL yyyy")}
                next2Label={null}
                prev2Label={null}
                className="custom-calendar_full-view"
              />
            ) : (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setWeekStart((prev) => subWeeks(prev, 1))}
                    className="px-2 py-1 rounded bg-[#242329] cursor-pointer hover:bg-[#211F29] text-sm"
                  >
                    Prev
                  </button>
                  <div className="text-sm font-semibold">
                    {format(weekStart, "MMM d")} –{" "}
                    {format(addDays(weekStart, 6), "MMM d, yyyy")}
                  </div>
                  <button
                    onClick={() => setWeekStart((prev) => addWeeks(prev, 1))}
                    className="px-2 py-1 rounded bg-[#242329] cursor-pointer hover:bg-[#211F29] text-sm"
                  >
                    Next
                  </button>
                </div>
                <div className="grid grid-cols-7 rounded-lg p-4">
                  {getWeekDays().map((day, index) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const eventsForDay = tradeEvents.filter(
                      (e) => e.date === dayStr
                    );
                    return (
                      <div key={index}>
                        <div
                          key={day.toISOString()}
                          className={`p-4 rounded-lg flex gap-2 items-center ${
                            format(day, "yyyy-MM-dd") ===
                            format(value, "yyyy-MM-dd")
                          }`}
                        >
                          <div className="font-bold">{format(day, "EEE")}</div>
                          <div>{format(day, "d")}</div>
                        </div>
                        <div
                          className="border border-[#323232] h-100 cursor-pointer"
                          onClick={() => handleDateClick(day)}
                        >
                          <div className="mt-1 flex flex-col items-center gap-2 mt-2">
                            {eventsForDay.map((event, idx) =>
                              event.status === "TODAY" ? (
                                <div
                                  key={idx}
                                  className={`w-2 h-2 rounded-full bg-blue-500`}
                                />
                              ) : (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-center text-sm w-[80%] h-6 rounded-xl transition duration-200 
                                  cursor-pointer ${getColor(
                                    event.status
                                  )} ${getHoverColor(event.status)}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(new Date(event.dateBought));
                                    setEditingTrade(event);
                                    setIsModalOpen(true);
                                  }}
                                  onMouseEnter={(e) => e.stopPropagation()}
                                >
                                  {event.symbol}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
