"use client";

import "./custom-calendar.css";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { format, startOfWeek, addDays, subWeeks, addWeeks } from "date-fns";
import { useSession } from "next-auth/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradeModal from "../dashboard/components/modals/TradeModal";
import { useQueryClient } from "@tanstack/react-query";
import { Trade } from "../types/Trades";
import { withAuth } from "@/lib/withAuth";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedCalendar from "../reusablecalendar/AnimatedCalendar";
import WeekView from "./WeekView";

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

  const manualTrades: Trade[] = useMemo<Trade[]>(() => [], []);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const [keyModal, setKeyModal] = useState<boolean>(false);

  const { data: trades } = useTrades(userId, simulated);

  const keyModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        keyModalRef.current &&
        !keyModalRef.current.contains(e.target as Node)
      ) {
        setKeyModal(false);
      }
    };

    if (keyModal) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [keyModal]);

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
        <div className="label mt-1 flex min-[500px]:flex-col gap-1 justify-center items-center">
          {eventsForDay.map((event, idx) =>
            event.status === "TODAY" ? (
              <div key={idx} className={`w-2 h-2 rounded-full bg-blue-500`} />
            ) : (
              <div
                key={idx}
                className={`md:w-15 h-4 w-12 max-[500px]:w-2 max-[500px]:h-2 rounded-md transition duration-200 ${getColor(
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
                <span className="max-[500px]:hidden">{event.symbol}</span>
              </div>
            )
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="flex mt-30 justify-center">
        <div className="flex gap-10">
          <div className="md:flex flex-col gap-2 hidden">
            <div>Key</div>
            <div className="flex gap-2 items-center">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              <div>Today</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-10 h-4 bg-green-500 rounded-full"></div>
              <div>Won Position</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-10 h-4 bg-red-700 rounded-full"></div>
              <div>Lost Position</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-10 h-4 bg-orange-500 rounded-full"></div>
              <div>Open Position</div>
            </div>
          </div>

          <div className="md:max-w-200 md:w-[70vw] w-[95vw]">
            <div className="flex mb-4 justify-between md:justify-end items-center">
              <div ref={keyModalRef} className="flex md:hidden">
                <button
                  className="px-2 py-1 text-sm rounded cursor-pointer transition
                duration-100 hover:bg-[#211F29] border border-white/10"
                  onClick={() => setKeyModal(!keyModal)}
                >
                  Key
                </button>

                <AnimatePresence>
                  {keyModal && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="md:hidden absolute top-40 left-2 bg-[#0E0E10] border border-white/40 p-5 rounded"
                    >
                      <div className="flex flex-col gap-2 text-sm">
                        <div>Key</div>
                        <div className="flex gap-2 items-center">
                          <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                          <div>Today</div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <div>Won Position</div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-4 h-4 bg-red-700 rounded-full"></div>
                          <div>Lost Position</div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                          <div>Open Position</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
              <AnimatedCalendar
                value={value}
                onChange={(date) => handleDateClick(date)}
                tileContent={renderTileContent}
                className="custom-calendar_full-view"
              />
            ) : (
              <WeekView
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
