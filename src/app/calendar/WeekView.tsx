// components/WeekView.tsx

"use client";

import { useRef, useState, useMemo } from "react";
import { format, addDays, addWeeks, subWeeks } from "date-fns";
import { Trade } from "../types/Trades";

type TradeEventType = "WIN" | "LOSS" | "OPEN" | "TODAY";

type TradeEvent = Trade | { date: string; status: "TODAY" };

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

interface WeekViewProps {
  value: Date;
  trades: Trade[] | undefined;
  onDateClick: (date: Date) => void;
  onEventClick: (event: Trade) => void;
}

export default function WeekView({
  value,
  trades,
  onDateClick,
  onEventClick,
}: WeekViewProps) {
  const weekGridRef = useRef<HTMLDivElement>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const tradeEvents: TradeEvent[] = useMemo(() => {
    const baseEvents: TradeEvent[] = trades
      ? trades.map((trade) => ({
          ...trade,
          date: trade.dateBought.split("T")[0],
        }))
      : [];
    return [{ date: today, status: "TODAY" }, ...baseEvents];
  }, [trades]);

  const getWeekDays = () =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleWeekChange = (dir: "prev" | "next") => {
    const grid = weekGridRef.current?.querySelector(
      ".week-grid"
    ) as HTMLElement;
    if (!grid) return;

    grid.style.pointerEvents = "none";
    grid.style.transition = "transform 0.22s ease, opacity 0.22s ease";
    grid.style.transform = `translateX(${dir === "next" ? "-50px" : "50px"})`;
    grid.style.opacity = "0";

    setTimeout(() => {
      grid.style.transition = "none";
      grid.style.transform = `translateX(${dir === "next" ? "50px" : "-50px"})`;
      grid.style.opacity = "0";
      setWeekStart((prev) =>
        dir === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)
      );

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          grid.style.transition = "transform 0.22s ease, opacity 0.22s ease";
          grid.style.transform = "translateX(0)";
          grid.style.opacity = "1";
          grid.style.pointerEvents = "";
        });
      });
    }, 220);
  };

  return (
    <div ref={weekGridRef}>
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => handleWeekChange("prev")}
          className="px-2 py-1 rounded bg-[#242329] cursor-pointer hover:bg-[#211F29] text-sm"
        >
          &lt;
        </button>
        <div className="md:text-sm text-xs font-semibold">
          {format(weekStart, "MMM d")} –{" "}
          {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </div>
        <button
          onClick={() => handleWeekChange("next")}
          className="px-2 py-1 rounded bg-[#242329] cursor-pointer hover:bg-[#211F29] text-sm"
        >
          &gt;
        </button>
      </div>

      <div className="overflow-hidden">
        <div className="week-grid grid grid-cols-7 rounded-lg md:p-4">
          {getWeekDays().map((day, index) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const eventsForDay = tradeEvents.filter((e) => e.date === dayStr);
            return (
              <div key={index}>
                <div
                  className={`p-4 rounded-lg flex items-center flex-col ${
                    format(day, "yyyy-MM-dd") === format(value, "yyyy-MM-dd")
                      ? "bg-white/5"
                      : ""
                  }`}
                >
                  <div className="md:text-sm text-xs">{format(day, "EEE")}</div>
                  <div className="md:text-sm text-xs">{format(day, "d")}</div>
                </div>
                <div
                  className="border border-[#323232] h-100 cursor-pointer"
                  onClick={() => onDateClick(day)}
                >
                  <div className="mt-1 flex flex-col items-center gap-2 mt-2">
                    {eventsForDay.map((event, idx) =>
                      event.status === "TODAY" ? (
                        <div
                          key={idx}
                          className="w-2 h-2 rounded-full bg-blue-500"
                        />
                      ) : (
                        <div
                          key={idx}
                          className={`flex items-center justify-center text-xs md:text-sm w-[80%] md:h-6 h-5 rounded-xl transition duration-200
                          cursor-pointer ${getColor(
                            event.status
                          )} ${getHoverColor(event.status)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event as Trade);
                          }}
                          onMouseEnter={(e) => e.stopPropagation()}
                        >
                          {(event as Trade).symbol}
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
    </div>
  );
}
