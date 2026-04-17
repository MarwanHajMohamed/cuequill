"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface TimezoneDisplayProps {
  className?: string;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  showDay?: boolean;
  showMonth?: boolean;
  showYear?: boolean;
  showWeekDay?: boolean;
  monthFormat?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  yearFormat?: "numeric" | "2-digit";
  weekDayFormat?: "long" | "short" | "narrow";
}

const TimezoneDisplay = ({
  className,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
  showDay = false,
  showMonth = false,
  showYear = false,
  showWeekDay = false,
  monthFormat = "short",
  yearFormat = "numeric",
  weekDayFormat = "long",
}: TimezoneDisplayProps) => {
  const { data: session } = useSession();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const tz =
    session?.user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    ...(showWeekDay && { weekday: weekDayFormat }),
    ...(showDay && { day: "2-digit" }),
    ...(showMonth && { month: monthFormat }),
    ...(showYear && { year: yearFormat }),
    ...(showHours && { hour: "2-digit" }),
    ...(showMinutes && { minute: "2-digit" }),
    ...(showSeconds && { second: "2-digit" }),
    hour12: false,
  }).format(now);

  return <span className={className}>{formatted}</span>;
};

export default TimezoneDisplay;
