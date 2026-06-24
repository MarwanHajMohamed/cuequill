"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { withAuth } from "@/lib/withAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useEarnings } from "@/hooks/useEarnings";
import { Spinner } from "@/components/Loaders";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function EarningsPage() {
  const { data: watchlist = [], save, saving, isLoading: wlLoading } =
    useWatchlist();
  const { data: earnings = [], isLoading: eLoading } = useEarnings(watchlist);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [input, setInput] = useState("");

  // Map day → earnings reporting that day (only dated entries).
  const byDay = useMemo(() => {
    const m = new Map<string, typeof earnings>();
    for (const e of earnings) {
      if (!e.date) continue;
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [earnings]);

  const upcoming = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return earnings
      .filter((e) => e.date && e.date >= todayStr)
      .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
  }, [earnings]);

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const addSymbol = () => {
    const s = input.trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,10}$/.test(s)) return;
    if (watchlist.includes(s)) {
      setInput("");
      return;
    }
    save([...watchlist, s]);
    setInput("");
  };

  const removeSymbol = (s: string) =>
    save(watchlist.filter((x) => x !== s));

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-24">
      {/* Aurora wash, same as the other app surfaces. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1100px] px-4 md:px-6 pt-24 md:pt-28 flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Earnings calendar
          </h1>
          <p className="mt-1 text-[13px] text-white/50">
            Upcoming earnings for the symbols on your watchlist, from Yahoo
            Finance.
          </p>
        </div>

        {/* Watchlist editor */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium">
              Watchlist
            </span>
            {saving && (
              <span className="text-[11px] text-white/40 inline-flex items-center gap-1.5">
                <Spinner size={12} /> Saving
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {watchlist.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[12.5px] font-medium tabular-nums"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSymbol(s)}
                  aria-label={`Remove ${s}`}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-[9px]" />
                </button>
              </span>
            ))}
            {!wlLoading && watchlist.length === 0 && (
              <span className="text-[12.5px] text-white/40">
                Add a ticker to start tracking earnings.
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] focus-within:border-teal-500/40 transition">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSymbol();
                }}
                placeholder="Add ticker"
                maxLength={10}
                className="bg-transparent outline-none text-[12.5px] px-3 py-1 w-[110px] placeholder:text-white/35 uppercase"
              />
              <button
                type="button"
                onClick={addSymbol}
                aria-label="Add ticker"
                className="w-6 h-6 mr-1 rounded-full flex items-center justify-center text-teal-300 hover:bg-teal-500/15 transition cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[11px]" />
              </button>
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
          {/* Calendar */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold tracking-tight tabular-nums">
                {format(viewMonth, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-1">
                <CalNav
                  dir="prev"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                />
                <button
                  type="button"
                  onClick={() => setViewMonth(startOfMonth(new Date()))}
                  className="px-2.5 py-1 rounded-full text-[11px] text-white/60 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                >
                  Today
                </button>
                <CalNav
                  dir="next"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                />
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] uppercase tracking-[0.12em] text-white/35 py-1"
                >
                  {d.slice(0, 1)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const events = byDay.get(key) ?? [];
                const muted = !isSameMonth(day, viewMonth);
                const today = isToday(day);
                return (
                  <div
                    key={key}
                    className={`relative min-h-[58px] md:min-h-[68px] rounded-lg border p-1.5 flex flex-col gap-1 ${
                      today
                        ? "border-teal-500/40 bg-teal-500/[0.06]"
                        : "border-white/[0.06] bg-white/[0.01]"
                    } ${muted ? "opacity-35" : ""}`}
                  >
                    <span
                      className={`text-[10px] tabular-nums ${
                        today ? "text-teal-300 font-medium" : "text-white/45"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {events.slice(0, 2).map((e) => (
                        <span
                          key={e.symbol}
                          title={`${e.symbol}${e.isEstimate ? " (estimated)" : ""}`}
                          className={`text-[9.5px] md:text-[10px] font-medium tabular-nums leading-tight truncate px-1 py-0.5 rounded ${
                            e.isEstimate
                              ? "bg-white/[0.05] text-white/55"
                              : "bg-teal-500/15 text-teal-200"
                          }`}
                        >
                          {e.symbol}
                        </span>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[9px] text-white/40 px-1">
                          +{events.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming list */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold tracking-tight">
                Upcoming
              </h2>
              {eLoading && <Spinner size={14} />}
            </div>

            {!eLoading && upcoming.length === 0 ? (
              <p className="text-[13px] text-white/40 py-6 text-center">
                {watchlist.length === 0
                  ? "Your watchlist is empty."
                  : "No upcoming earnings dates found."}
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-white/[0.06]">
                {upcoming.map((e) => (
                  <div
                    key={e.symbol}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="w-[52px] shrink-0 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-white/40 leading-none">
                        {format(parseISO(e.date!), "MMM")}
                      </div>
                      <div className="text-[17px] font-medium tabular-nums leading-tight">
                        {format(parseISO(e.date!), "d")}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold tabular-nums">
                          {e.symbol}
                        </span>
                        {e.isEstimate && (
                          <span className="text-[9px] uppercase tracking-wide text-white/40 border border-white/15 rounded px-1 py-0.5">
                            Est.
                          </span>
                        )}
                      </div>
                      {e.name && (
                        <div className="text-[11.5px] text-white/45 truncate">
                          {e.name}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] uppercase tracking-wide text-white/35 leading-none">
                        EPS est.
                      </div>
                      <div className="text-[13px] tabular-nums text-white/75">
                        {e.epsEstimate != null
                          ? `$${e.epsEstimate.toFixed(2)}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalNav({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      className="w-7 h-7 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
    >
      <i
        className={`fa-solid fa-chevron-${dir === "prev" ? "left" : "right"} text-[11px]`}
      />
    </button>
  );
}

export default withAuth(EarningsPage);
