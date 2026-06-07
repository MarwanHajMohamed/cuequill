"use client";

import TimezoneDisplay from "@/helpers/TimezoneDisplay";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useState, useEffect } from "react";

// New-York "now" for market-hour math. Returns a Date whose getHours /
// getDay etc. read out the wall-clock time in America/New_York.
const getNyNow = () =>
  new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

// Compute the next market open or close as a relative duration string
// (e.g. "Opens in 2h 14m" / "Closes in 47m"). Returns null on weekends.
const useMarketCountdown = () => {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const ny = getNyNow();
      const day = ny.getDay();
      const hours = ny.getHours();
      const minutes = ny.getMinutes();
      const isWeekday = day >= 1 && day <= 5;
      const afterOpen = hours > 9 || (hours === 9 && minutes >= 30);
      const beforeClose = hours < 16;
      const open = isWeekday && afterOpen && beforeClose;

      const target = new Date(ny);
      if (open) {
        target.setHours(16, 0, 0, 0);
        const diffMs = target.getTime() - ny.getTime();
        setLabel(`Closes in ${formatDuration(diffMs)}`);
        return;
      }

      // Next open: today 9:30 if pre-open weekday; otherwise next weekday
      // 9:30.
      const next = new Date(ny);
      next.setSeconds(0, 0);
      if (isWeekday && !afterOpen) {
        next.setHours(9, 30, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1);
        }
        next.setHours(9, 30, 0, 0);
      }
      const diffMs = next.getTime() - ny.getTime();
      setLabel(`Opens in ${formatDuration(diffMs)}`);
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return label;
};

const formatDuration = (ms: number) => {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

export default function Time() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const { data: session } = useSession();
  const name = session?.user.firstname;
  const countdown = useMarketCountdown();

  useEffect(() => {
    const updateTime = () => setCurrentTime(getNyNow());
    updateTime();

    const msUntilNextMinute =
      60000 - (new Date().getSeconds() * 1000 + new Date().getMilliseconds());
    const timeout = setTimeout(() => {
      updateTime();
      const interval = setInterval(updateTime, 60_000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, []);

  if (!currentTime) {
    return (
      <div className="w-full max-w-[1500px] mt-30 px-5 md:px-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 justify-between">
          <div className="flex flex-col gap-4 w-full">
            <div className="h-5 w-32 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-10 w-2/3 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-4 w-1/2 rounded-lg bg-white/10 animate-pulse" />
          </div>
          <div className="h-[140px] md:w-[320px] w-full rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  const day = currentTime.getDay();
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const marketOpen =
    day >= 1 &&
    day <= 5 &&
    (hours > 9 || (hours === 9 && minutes >= 30)) &&
    hours < 16;

  const greeting =
    hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative w-full max-w-[1500px] mt-30 px-5 md:px-10 overflow-x-clip">
      {/* Aurora glow — full multi-color on desktop, a single smaller
          teal blob on mobile so it doesn't dominate the viewport. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        {/* Mobile: one soft teal blob, sized to the hero. */}
        <div className="md:hidden absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-teal-500/12 blur-[100px]" />
        {/* Desktop: full multi-color aurora. */}
        <div className="hidden md:block absolute -top-72 -left-72 w-[900px] h-[900px] rounded-full bg-teal-500/15 blur-[180px]" />
        <div className="hidden md:block absolute -top-64 -right-72 w-[820px] h-[820px] rounded-full bg-indigo-500/15 blur-[180px]" />
        <div className="hidden md:block absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-fuchsia-500/[0.07] blur-[160px]" />
      </div>

      <div className="flex flex-col md:flex-row justify-between md:items-end gap-8 md:gap-12">
        {/* LEFT — greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-3 md:max-w-[60%]"
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/40 font-medium">
            {greeting}
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              {name}
            </span>
          </h1>
          <p className="text-sm md:text-[15px] text-white/55 max-w-md leading-relaxed">
            {marketOpen
              ? "Markets are live. Stay disciplined — review your "
              : "Markets are quiet. Use the time to review your "}
            <Link
              href="/affirmations"
              prefetch
              className="text-white/80 underline decoration-white/20 underline-offset-2 hover:decoration-teal-400 hover:text-white transition"
            >
              affirmations
            </Link>
            {marketOpen ? " before the next setup." : " and yesterday's trades."}
          </p>
        </motion.div>

        {/* RIGHT — status card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          className="w-full md:w-[340px] rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
        >
          {/* Top row: market status + countdown */}
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                marketOpen
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              <span className="relative flex w-2 h-2">
                {marketOpen && (
                  <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                )}
                <span
                  className={`relative inline-flex w-2 h-2 rounded-full ${
                    marketOpen ? "bg-green-400" : "bg-red-400"
                  }`}
                />
              </span>
              <span className="uppercase tracking-wider text-[10px]">
                {marketOpen ? "Market open" : "Market closed"}
              </span>
            </div>
            {countdown && (
              <div className="text-[11px] text-white/50">{countdown}</div>
            )}
          </div>

          {/* Big NY clock */}
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-4xl md:text-5xl font-light tracking-tight tabular-nums text-white">
              <TimezoneDisplay showSeconds={false} />
            </div>
            <div className="text-[11px] text-white/40 uppercase tracking-wider">
              NY
            </div>
          </div>

          {/* Date + premarket link */}
          <div className="mt-3 flex items-center justify-between text-[12px] text-white/55">
            <TimezoneDisplay
              showWeekDay
              showDay
              showMonth
              weekDayFormat="short"
              showHours={false}
              showMinutes={false}
              showSeconds={false}
            />
            <a
              href="https://www.marketwatch.com/investing/fund/spy"
              className="text-white/55 hover:text-teal-400 transition inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Premarket <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
