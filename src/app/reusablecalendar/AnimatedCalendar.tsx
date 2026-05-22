// components/AnimatedCalendar.tsx

"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Calendar, { OnArgs } from "react-calendar";
import { format } from "date-fns";

export type AnimatedCalendarHandle = {
  goToToday: () => void;
};

interface AnimatedCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  tileContent?: ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => React.ReactNode;
  tileClassName?: ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => string | null | undefined;
  className?: string;
  /** Render the built-in Today button inside the calendar. Defaults to true. */
  showTodayButton?: boolean;
}

const AnimatedCalendar = forwardRef<
  AnimatedCalendarHandle,
  AnimatedCalendarProps
>(function AnimatedCalendar(
  {
    value,
    onChange,
    tileContent,
    tileClassName,
    className = "custom-calendar_full-view",
    showTodayButton = true,
  },
  ref
) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());

  // Swipe handlers — left = next month, right = previous month.
  // Triggers the real next/prev buttons so the existing slide animation runs.
  const triggerNavButton = (
    selector:
      | ".react-calendar__navigation__next-button"
      | ".react-calendar__navigation__prev-button"
  ) => {
    const btn = calendarRef.current?.querySelector(
      selector
    ) as HTMLButtonElement | null;
    btn?.click();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;

    // Require a clear horizontal intent: >60px sideways AND mostly horizontal
    // (so vertical page scrolling never triggers a month change).
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;

    if (dx < 0) {
      triggerNavButton(".react-calendar__navigation__next-button");
    } else {
      triggerNavButton(".react-calendar__navigation__prev-button");
    }
  };

  const goToToday = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonth = new Date(
      activeStartDate.getFullYear(),
      activeStartDate.getMonth(),
      1
    );
    if (target.getTime() === currentMonth.getTime()) return;

    // Reuse the next/prev animation by feeding the existing handler.
    handleActiveStartDateChange({
      action: target > currentMonth ? "next" : "prev",
      activeStartDate: target,
      value: now,
      view: "month",
    } as OnArgs);
  };

  useImperativeHandle(ref, () => ({ goToToday }));

  const handleActiveStartDateChange = ({
    action,
    activeStartDate: newDate,
  }: OnArgs) => {
    if (!newDate) return;

    // No animation for drillDown/drillUp/onChange — just update the date
    if (action !== "next" && action !== "prev") {
      setActiveStartDate(newDate);
      return;
    }

    const dir = action === "next" ? "left" : "right";
    const days = calendarRef.current?.querySelector(
      ".react-calendar__month-view__days"
    ) as HTMLElement;

    // If there's no days grid visible (e.g. year view), just update
    if (!days) {
      setActiveStartDate(newDate);
      return;
    }

    days.style.pointerEvents = "none";
    days.style.transition = "transform 0.22s ease, opacity 0.22s ease";
    days.style.transform = `translateX(${dir === "left" ? "-50px" : "50px"})`;
    days.style.opacity = "0";

    setTimeout(() => {
      days.style.transition = "none";
      days.style.transform = `translateX(${dir === "left" ? "50px" : "-50px"})`;
      days.style.opacity = "0";
      setActiveStartDate(newDate);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          days.style.transition = "transform 0.22s ease, opacity 0.22s ease";
          days.style.transform = "translateX(0)";
          days.style.opacity = "1";
          days.style.pointerEvents = "";
        });
      });
    }, 220);
  };

  return (
    <div
      ref={calendarRef}
      className="overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {showTodayButton && (
        <div className="flex justify-end mb-1">
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-white/70 hover:text-white cursor-pointer transition"
          >
            Today
          </button>
        </div>
      )}
      <Calendar
        onChange={(val) => onChange(val as Date)}
        value={value}
        tileContent={tileContent}
        tileClassName={tileClassName}
        calendarType="iso8601"
        formatShortWeekday={(_, date) => format(date, "EEE")}
        formatMonthYear={(_, date) => format(date, "LLLL yyyy")}
        next2Label={null}
        prev2Label={null}
        activeStartDate={activeStartDate}
        onActiveStartDateChange={handleActiveStartDateChange}
        className={className}
      />
    </div>
  );
});

export default AnimatedCalendar;
