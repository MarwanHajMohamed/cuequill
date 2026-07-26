"use client";

import TimezoneDisplay from "@/helpers/TimezoneDisplay";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import React, { useState, useEffect } from "react";
import { getMarketDay, isMarketOpenAt } from "@/lib/marketHolidays";

// Returns a Date whose getHours / getDay etc. read out the wall-clock
// time in the given IANA timezone. Used both for NY-based market math
// and for the user-local greeting.
const getNowIn = (tz: string) =>
  new Date(new Date().toLocaleString("en-US", { timeZone: tz }));

const getNyNow = () => getNowIn("America/New_York");

// Short display label for the user's timezone (e.g. "BST", "PDT",
// "GMT+1"). Falls back to the trailing IANA segment ("New_York" →
// "New York") if Intl doesn't return a name part.
const tzLabel = (tz: string): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name) return name;
  } catch {
    /* fall through */
  }
  const tail = tz.split("/").pop() ?? tz;
  return tail.replace(/_/g, " ");
};

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
      const todayMarket = getMarketDay(ny);
      // Holiday-aware: false on full-day closures and after the 1pm ET
      // early closes, so the "Closes in / Opens in" label doesn't keep
      // counting down on a day the bell never rings.
      const open = isMarketOpenAt(ny);

      if (open) {
        // Close time depends on the day - 1pm on early-close days,
        // 4pm otherwise.
        const closeHour = todayMarket?.early ? 13 : 16;
        const target = new Date(ny);
        target.setHours(closeHour, 0, 0, 0);
        const diffMs = target.getTime() - ny.getTime();
        setLabel(`Closes in ${formatDuration(diffMs)}`);
        return;
      }

      // Next open: step forward day-by-day skipping weekends AND any
      // full-day NYSE closure (Juneteenth, Christmas, etc.) so we don't
      // promise "Opens in 2h" on a holiday morning.
      const next = new Date(ny);
      next.setSeconds(0, 0);
      const isFullHoliday = todayMarket && !todayMarket.early;
      if (isWeekday && !afterOpen && !isFullHoliday) {
        next.setHours(9, 30, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        while (
          next.getDay() === 0 ||
          next.getDay() === 6 ||
          (() => {
            const md = getMarketDay(next);
            return md !== null && !md.early;
          })()
        ) {
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
  const userTz =
    session?.user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userTzLabel = tzLabel(userTz);
  const countdown = useMarketCountdown();

  useEffect(() => {
    // Greeting reads out the USER's wall-clock hour (not NY's), so
    // London at 2pm doesn't get "Good morning" because it's still
    // 9am ET. Re-derived when the user's tz changes.
    const updateTime = () => setCurrentTime(getNowIn(userTz));
    updateTime();

    const msUntilNextMinute =
      60000 - (new Date().getSeconds() * 1000 + new Date().getMilliseconds());
    const timeout = setTimeout(() => {
      updateTime();
      const interval = setInterval(updateTime, 60_000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, [userTz]);

  if (!currentTime) {
    return (
      <div className="w-full mt-30 md:mt-10 px-5 md:px-10">
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

  const hours = currentTime.getHours();

  const greeting =
    hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative w-full mt-30 md:mt-10 px-5 md:px-10">
      {/* Aurora glow - anchored to the VIEWPORT (fixed inset-0), not the
          max-width hero container, so on ultra-wide screens the glow
          feathers all the way to the screen edges instead of cutting
          off at 1500px.
          - Mobile: a single cheap radial-gradient (CSS filter blur at
            ≥100px tanks mobile GPUs; gradients are composited free).
          - Desktop: multi-color radial gradients spanning the full
            viewport width, mirroring the blob layout the hero used
            before but without a clipping container. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 md:hidden"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 hidden md:block"
        style={{
          background:
            "radial-gradient(45% 55% at 12% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 72%), radial-gradient(42% 50% at 88% 0%, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 72%), radial-gradient(35% 40% at 50% 18%, rgba(217,70,239,0.07) 0%, rgba(217,70,239,0) 70%)",
        }}
      />

      <div className="flex flex-col md:flex-row justify-between md:items-end gap-8 md:gap-12">
        {/* LEFT - greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-3 md:max-w-[60%]"
        >
          <div className="text-[12px] tracking-[0.1em] text-white/40 font-medium">
            {greeting}
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              {name}
            </span>
          </h1>
        </motion.div>

        {/* RIGHT - clock */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          className="flex flex-col gap-1 md:items-end"
        >
          {/* Big clock — user's own timezone, labelled with their
              tz's short name (BST / PDT / GMT+1 / …). */}
          <div className="flex items-baseline gap-2">
            <div className="text-2xl md:text-3xl font-light tracking-tight tabular-nums text-white">
              <TimezoneDisplay showSeconds={false} />
            </div>
            <div className="text-[11px] text-white/40 uppercase tracking-wider">
              {userTzLabel}
            </div>
          </div>

          {/* Date + countdown */}
          <div className="flex items-center gap-2 text-[12px] text-white/45">
            <TimezoneDisplay
              showWeekDay
              showDay
              showMonth
              weekDayFormat="short"
              showHours={false}
              showMinutes={false}
              showSeconds={false}
            />
            {countdown && (
              <>
                <span className="text-white/25">·</span>
                <span>{countdown}</span>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
