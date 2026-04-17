"use client";

import TimezoneDisplay from "@/helpers/TimezoneDisplay";
import { useSession } from "next-auth/react";
import React, { useState, useEffect } from "react";

export default function Time() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const { data: session } = useSession();
  const name = session?.user.firstname;

  useEffect(() => {
    const updateTime = () => {
      const newTime = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/New_York",
        })
      );
      setCurrentTime(newTime);
    };

    updateTime();

    const msUntilNextMinute =
      60000 - (new Date().getSeconds() * 1000 + new Date().getMilliseconds());
    const timeout = setTimeout(() => {
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, []);

  if (!currentTime) {
    return (
      <div className="flex flex-row justify-between h-70 pl-10 pr-10 mt-30 mb-5 w-[100%] max-w-400">
        <div className="flex flex-col space-y-4 w-full">
          <div className="h-10 w-1/3 rounded-lg bg-white/10 animate-pulse"></div>
          <div className="h-10 w-1/6 rounded-lg bg-white/10 animate-pulse"></div>
        </div>

        <div className="flex flex-col items-end space-y-3 h-[100%] justify-end">
          <div className="h-8 w-20 rounded-lg bg-white/10 animate-pulse"></div>
          <div className="h-6 w-24 rounded-lg bg-white/10 animate-pulse"></div>
          <div className="h-6 w-28 rounded-lg bg-white/10 animate-pulse"></div>
          <div className="h-6 w-32 rounded-lg bg-white/10 animate-pulse"></div>
        </div>
      </div>
    );
  }

  const day = currentTime.getDay();
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  const isAfterOpen = hours > 9 || (hours === 9 && minutes >= 30);
  const isBeforeClose = hours < 16;

  const marketOpen = isWeekday && isAfterOpen && isBeforeClose;

  return (
    <div className="flex flex-row justify-between h-70 pl-10 pr-10 mt-30 mb-5 w-[100%] max-w-400">
      <div className="flex flex-col justify-between">
        <div className="flex flex-col text-5xl">
          {hours < 13
            ? "Good morning,"
            : hours < 17
            ? "Good afternoon,"
            : "Good evening,"}
          <span className="text-teal-500">{name}</span>
        </div>
        <div>
          Have you read your{" "}
          <a href="/affirmations" className="underline">
            affirmations
          </a>{" "}
          today?
        </div>
      </div>
      <div className="flex flex-col justify-end items-end">
        <div className="text-2xl">
          <TimezoneDisplay />
        </div>
        <div>
          Market:{" "}
          {marketOpen ? (
            <span className="text-green-500">Open</span>
          ) : (
            <span className="text-red-500">Closed</span>
          )}
        </div>
        <div>
          <TimezoneDisplay
            showWeekDay
            showDay
            showMonth
            weekDayFormat="short"
            showHours={false}
            showMinutes={false}
            showSeconds={false}
          />
        </div>
        <div>
          Check out the{" "}
          <a
            href="https://www.marketwatch.com/investing/fund/spy"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            premarket
          </a>
        </div>
      </div>
    </div>
  );
}
