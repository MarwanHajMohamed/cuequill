// components/WeekView.tsx

"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { format, addDays, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { Trade } from "../types/Trades";

export type WeekViewHandle = { goToToday: () => void };

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

const WeekView = forwardRef<WeekViewHandle, WeekViewProps>(function WeekView(
  { value, trades, onDateClick, onEventClick },
  ref,
) {
  const weekGridRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{
    x: number;
    y: number;
    mode: "idle" | "horizontal" | "vertical";
  } | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const getGridEl = () =>
    (weekGridRef.current?.querySelector(".week-grid") as HTMLElement | null) ??
    null;

  // Finger-following swipe: drag the week grid in real time, then either snap
  // back (small swipe) or slide off and switch week (large swipe).
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      mode: "idle",
    };
    const grid = getGridEl();
    if (grid) grid.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;

    if (start.mode === "idle") {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        start.mode = "vertical";
        return;
      }
      if (Math.abs(dx) > 10) {
        start.mode = "horizontal";
      }
    }

    if (start.mode === "horizontal") {
      const grid = getGridEl();
      if (grid) {
        const tx = dx - (dx > 0 ? 10 : -10);
        grid.style.transform = `translateX(${tx}px)`;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const grid = getGridEl();
    if (!grid) return;

    if (start.mode !== "horizontal") {
      grid.style.transition = "transform 0.18s ease";
      grid.style.transform = "";
      return;
    }

    const dx = e.changedTouches[0].clientX - start.x;
    const width = grid.getBoundingClientRect().width || 1;
    const threshold = Math.min(80, width * 0.25);

    if (Math.abs(dx) > threshold) {
      commitSwipe(dx < 0 ? "next" : "prev");
    } else {
      grid.style.transition = "transform 0.18s ease";
      grid.style.transform = "translateX(0)";
    }
  };

  const commitSwipe = (dir: "next" | "prev") => {
    const grid = getGridEl();
    if (!grid) return;
    const width = grid.getBoundingClientRect().width || 1;
    const target =
      dir === "next" ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);

    grid.style.pointerEvents = "none";
    grid.style.transition = "transform 0.18s ease, opacity 0.18s ease";
    grid.style.transform = `translateX(${dir === "next" ? -width : width}px)`;
    grid.style.opacity = "0";

    setTimeout(() => {
      grid.style.transition = "none";
      grid.style.transform = `translateX(${dir === "next" ? width : -width}px)`;
      grid.style.opacity = "0";
      setWeekStart(target);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const after = getGridEl();
          if (!after) return;
          after.style.transition = "transform 0.18s ease, opacity 0.18s ease";
          after.style.transform = "translateX(0)";
          after.style.opacity = "1";
          after.style.pointerEvents = "";
        });
      });
    }, 180);
  };

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
    Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const animateWeekChange = (dir: "prev" | "next", target: Date) => {
    const grid = weekGridRef.current?.querySelector(
      ".week-grid",
    ) as HTMLElement;
    if (!grid) {
      setWeekStart(target);
      return;
    }

    grid.style.pointerEvents = "none";
    grid.style.transition = "transform 0.22s ease, opacity 0.22s ease";
    grid.style.transform = `translateX(${dir === "next" ? "-50px" : "50px"})`;
    grid.style.opacity = "0";

    setTimeout(() => {
      grid.style.transition = "none";
      grid.style.transform = `translateX(${dir === "next" ? "50px" : "-50px"})`;
      grid.style.opacity = "0";
      setWeekStart(target);

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

  const handleWeekChange = (dir: "prev" | "next") => {
    const target =
      dir === "next" ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    animateWeekChange(dir, target);
  };

  const goToToday = () => {
    const todayWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    if (todayWeek.getTime() === weekStart.getTime()) return;
    animateWeekChange(todayWeek > weekStart ? "next" : "prev", todayWeek);
  };

  useImperativeHandle(ref, () => ({ goToToday }));

  return (
    <div
      ref={weekGridRef}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-between items-center mb-0 gap-2">
        <button
          onClick={() => handleWeekChange("prev")}
          className="px-2 py-1 rounded bg-[#242329] cursor-pointer hover:bg-[#211F29] text-sm"
        >
          &lt;
        </button>
        <div className="md:text-sm text-xs font-semibold">
          {format(weekStart, "MMM d")} –{" "}
          {format(addDays(weekStart, 4), "MMM d, yyyy")}
        </div>
        <button
          onClick={() => handleWeekChange("next")}
          className="px-2 py-1 rounded bg-[#242329] cursor-pointer hover:bg-[#211F29] text-sm"
        >
          &gt;
        </button>
      </div>

      <div className="overflow-hidden">
        <div className="week-grid grid grid-cols-5 rounded-lg md:p-4">
          {getWeekDays().map((day, index) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const eventsForDay = tradeEvents.filter((e) => e.date === dayStr);
            const closedTrades = eventsForDay.filter(
              (e) => e.status === "WIN" || e.status === "LOSS",
            ) as Trade[];
            const netPL = closedTrades.reduce(
              (sum, e) => sum + (e.profitLoss ?? 0),
              0,
            );
            return (
              <div key={index}>
                <div
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 ${
                    format(day, "yyyy-MM-dd") === format(value, "yyyy-MM-dd")
                      ? "bg-white/5"
                      : ""
                  }`}
                >
                  <div className="md:text-sm text-xs">{format(day, "EEE")}</div>
                  <div className="md:text-sm text-xs">{format(day, "d")}</div>
                </div>
                <div
                  className="border border-[#323232] h-[calc(100vh-280px)] cursor-pointer flex flex-col justify-between"
                  onClick={() => onDateClick(day)}
                >
                  <div className="mt-2 flex flex-col items-center gap-2 px-1">
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
                            event.status,
                          )} ${getHoverColor(event.status)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event as Trade);
                          }}
                          onMouseEnter={(e) => e.stopPropagation()}
                        >
                          {(event as Trade).symbol}
                        </div>
                      ),
                    )}
                  </div>
                  {closedTrades.length > 0 && (
                    <div
                      className={`border-t border-[#323232] text-center py-2 text-xs md:text-sm font-semibold ${
                        netPL >= 0
                          ? "text-green-500 bg-green-500/15"
                          : "text-red-500 bg-red-500/15"
                      }`}
                    >
                      {netPL >= 0 ? "+" : "−"}${Math.abs(netPL).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default WeekView;
