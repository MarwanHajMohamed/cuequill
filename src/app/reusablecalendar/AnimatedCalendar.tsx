// components/AnimatedCalendar.tsx

"use client";

import { useRef, useState } from "react";
import Calendar, { OnArgs } from "react-calendar";
import { format } from "date-fns";

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
}

export default function AnimatedCalendar({
  value,
  onChange,
  tileContent,
  tileClassName,
  className = "custom-calendar_full-view",
}: AnimatedCalendarProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());

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
    <div ref={calendarRef} className="overflow-hidden">
      <Calendar
        onChange={(val) => onChange(val as Date)}
        value={value}
        tileContent={tileContent}
        tileClassName={tileClassName}
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
}
