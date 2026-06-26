// components/WeekView.tsx

"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { format, addDays, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { Trade } from "../types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
export type WeekViewHandle = { goToToday: () => void };

type TradeEventType = "WIN" | "LOSS" | "OPEN" | "TODAY";

type TradeEvent = Trade | { date: string; status: "TODAY" };

const now = new Date();
const today = now.toISOString().split("T")[0];

// Pill styling per status - tinted bg + matching border + text colour.
// Matches the rest of the app's pill language (e.g. market-status pill,
// strategy direction chip).
const pillStyle = (status: TradeEventType) => {
  switch (status) {
    case "WIN":
      return "bg-green-500/15 text-green-300 border-green-500/30 hover:bg-green-500/25";
    case "LOSS":
      return "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25";
    case "OPEN":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/25";
    default:
      return "";
  }
};

interface WeekViewProps {
  value: Date;
  trades: Trade[] | undefined;
  onDateClick: (date: Date) => void;
  onEventClick: (event: Trade) => void;
  /** Fires whenever the visible week changes - lets the parent show a
   * week summary that follows along. */
  onWeekChange?: (weekStart: Date) => void;
}

const WeekView = forwardRef<WeekViewHandle, WeekViewProps>(function WeekView(
  { value, trades, onDateClick, onEventClick, onWeekChange },
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

  // Surface the current week's start to the parent so it can render a
  // running week summary (net P/L etc.) alongside the calendar.
  useEffect(() => {
    onWeekChange?.(weekStart);
  }, [weekStart, onWeekChange]);

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
      ? trades.map((trade) => {
          const isClosed =
            trade.status === "WIN" || trade.status === "LOSS";
          const bucketDate =
            isClosed && trade.dateClosed
              ? trade.dateClosed.split("T")[0]
              : trade.dateBought.split("T")[0];
          return {
            ...trade,
            date: bucketDate,
          };
        })
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

  const todayStr = today;

  return (
    <div
      ref={weekGridRef}
      style={{ touchAction: "pan-y" }}
      className="md:h-auto h-full flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header: prev / range / next */}
      <div className="flex justify-between items-center gap-2 shrink-0 mb-3">
        <button
          onClick={() => handleWeekChange("prev")}
          aria-label="Previous week"
          className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition cursor-pointer flex items-center justify-center"
        >
          <i className="fa-solid fa-chevron-left text-[11px]" />
        </button>
        <div className="flex flex-col items-center">
          <div className="text-[10px] tracking-[0.1em] text-white/40 font-medium">
            Week of
          </div>
          <div className="md:text-[14px] text-[13px] font-semibold tracking-tight tabular-nums">
            {format(weekStart, "MMM d")} –{" "}
            {format(addDays(weekStart, 4), "MMM d, yyyy")}
          </div>
        </div>
        <button
          onClick={() => handleWeekChange("next")}
          aria-label="Next week"
          className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition cursor-pointer flex items-center justify-center"
        >
          <i className="fa-solid fa-chevron-right text-[11px]" />
        </button>
      </div>

      <div className="overflow-hidden md:flex-initial flex-1 min-h-0 flex flex-col">
        <div className="week-grid grid grid-cols-5 gap-1.5 md:gap-2 md:h-auto h-full md:items-start items-stretch">
          {getWeekDays().map((day, index) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const eventsForDay = tradeEvents.filter((e) => e.date === dayStr);
            const closedTrades = eventsForDay.filter(
              (e) => e.status === "WIN" || e.status === "LOSS",
            ) as Trade[];
            const netPL = closedTrades.reduce(
              (sum, e) => sum + tradeNetPL(e),
              0,
            );
            const isToday = dayStr === todayStr;
            const isSelected =
              format(day, "yyyy-MM-dd") === format(value, "yyyy-MM-dd");
            return (
              <div
                key={index}
                className="md:h-auto h-full flex flex-col gap-1.5"
              >
                {/* Day header */}
                <div
                  className={`py-1.5 px-2 rounded-xl flex flex-col items-center gap-0 shrink-0 transition ${
                    isToday
                      ? "bg-teal-500/10 border border-teal-500/25"
                      : isSelected
                        ? "bg-white/[0.06] border border-white/10"
                        : "border border-transparent"
                  }`}
                >
                  <div
                    className={`text-[10px] tracking-wider font-medium ${
                      isToday ? "text-teal-300" : "text-white/40"
                    }`}
                  >
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={`text-[15px] font-semibold tabular-nums ${
                      isToday ? "text-teal-200" : "text-white/90"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>

                {/* Day card */}
                <button
                  type="button"
                  className={`rounded-xl border md:h-[calc(100vh-300px)] flex-1 md:flex-initial min-h-0 cursor-pointer flex flex-col justify-between text-left transition ${
                    isToday
                      ? "border-teal-500/25 bg-teal-500/[0.04] hover:bg-teal-500/[0.08]"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
                  }`}
                  onClick={() => onDateClick(day)}
                >
                  <div className="mt-2 flex flex-col items-stretch gap-1.5 px-1.5">
                    {eventsForDay.map((event, idx) =>
                      event.status === "TODAY" ? (
                        <div
                          key={idx}
                          className="self-center w-1.5 h-1.5 rounded-full bg-teal-400"
                        />
                      ) : (
                        <div
                          key={idx}
                          className={`flex items-center justify-center text-[10px] md:text-[11px] font-medium px-1.5 py-1 rounded-full border transition cursor-pointer truncate ${pillStyle(
                            event.status,
                          )}`}
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
                      className={`mx-1.5 mb-1.5 mt-2 text-center py-1.5 rounded-lg text-[12px] md:text-[13px] font-semibold tabular-nums ${
                        netPL >= 0
                          ? "text-green-300 bg-green-500/10 border border-green-500/20"
                          : "text-red-300 bg-red-500/10 border border-red-500/20"
                      }`}
                    >
                      {fmtMoneySignedCompact(netPL)}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default WeekView;
