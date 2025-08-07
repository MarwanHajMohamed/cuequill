"use client";

import React, { useState, useEffect } from "react";

export default function Time() {
  const [currentTime, setCurrentTime] = useState(
    new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
    )
  );

  const name = "Marwan";

  useEffect(() => {
    const updateTime = () => {
      const newTime = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/New_York",
        })
      );
      setCurrentTime(newTime);
    };

    const msUntilNextMinute =
      60000 - (currentTime.getSeconds() * 1000 + currentTime.getMilliseconds());
    const timeout = setTimeout(() => {
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, []);

  const day = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  const isAfterOpen = hours > 9 || (hours === 9 && minutes >= 30);
  const isBeforeClose = hours < 16;

  const marketOpen = isWeekday && isAfterOpen && isBeforeClose;

  return (
    <div className="flex flex-row justify-between h-70 pl-10 pr-10 mt-30 mb-5">
      <div className="flex flex-col justify-between">
        <div className="flex flex-col text-5xl">
          {currentTime.getHours() < 13
            ? "Good morning,"
            : currentTime.getHours() < 17
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
          {currentTime.getHours().toString().padStart(2, "0")}:
          {currentTime.getMinutes().toString().padStart(2, "0")}{" "}
          {currentTime.getHours() < 13 ? "AM" : "PM"}
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
          {currentTime.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
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
