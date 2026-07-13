"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useFedDates } from "@/hooks/useFedDates";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useEarnings } from "@/hooks/useEarnings";

// "Upcoming events" — the next market dates a discretionary options
// trader wants on their radar: FOMC (Fed) days and earnings reports for
// the tickers on their watchlist. Purely forward-looking; sorted by how
// soon each one lands and capped to the closest handful.

type UpcomingEvent = {
  date: string; // yyyy-MM-dd
  kind: "fed" | "earnings";
  symbol?: string;
  isEstimate?: boolean;
};

const MAX_EVENTS = 6;

// Parse a yyyy-MM-dd as a local calendar day (avoids the UTC shift that
// `new Date("yyyy-MM-dd")` introduces).
function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysUntil(dayStr: string, todayStr: string): number {
  const a = parseDay(todayStr).getTime();
  const b = parseDay(dayStr).getTime();
  return Math.round((b - a) / 86_400_000);
}

function relativeLabel(n: number): string {
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n < 7) return `In ${n} days`;
  if (n < 14) return "Next week";
  return `In ${Math.round(n / 7)} weeks`;
}

export default function DashboardUpcoming() {
  const fedDates = useFedDates();
  const { data: watchlist = [] } = useWatchlist();
  const { data: earnings = [] } = useEarnings(watchlist);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const events = useMemo<UpcomingEvent[]>(() => {
    const out: UpcomingEvent[] = [];

    for (const d of fedDates) {
      if (d >= todayStr) out.push({ date: d, kind: "fed" });
    }
    for (const e of earnings) {
      if (e.date && e.date >= todayStr) {
        out.push({
          date: e.date,
          kind: "earnings",
          symbol: e.symbol,
          isEstimate: e.isEstimate,
        });
      }
    }

    // Soonest first; within a day, Fed before earnings then alphabetical.
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === "fed" ? -1 : 1;
      return (a.symbol ?? "").localeCompare(b.symbol ?? "");
    });

    return out.slice(0, MAX_EVENTS);
  }, [fedDates, earnings, todayStr]);

  return (
    <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="md:text-xl text-sm font-bold">Upcoming events</h2>
        <Link
          href="/earnings"
          className="text-[11px] md:text-[12px] text-white/50 hover:text-white transition inline-flex items-center gap-1.5"
        >
          Manage watchlist
          <i className="fa-solid fa-chevron-right text-[9px]" />
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden">
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-300 flex items-center justify-center">
              <i className="fa-regular fa-calendar-check text-[15px]" />
            </div>
            <p className="mt-3 text-[13px] text-white/55 leading-relaxed max-w-sm mx-auto">
              No events on the radar.{" "}
              {watchlist.length === 0 ? (
                <>
                  Add tickers on the{" "}
                  <Link
                    href="/earnings"
                    className="text-teal-300 hover:text-teal-200 underline-offset-2 hover:underline"
                  >
                    Earnings page
                  </Link>{" "}
                  to track their report dates here.
                </>
              ) : (
                "Fed meetings and watchlist earnings will show up as they approach."
              )}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {events.map((ev, i) => (
              <EventRow key={`${ev.date}-${ev.kind}-${ev.symbol ?? ""}-${i}`} ev={ev} n={daysUntil(ev.date, todayStr)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventRow({ ev, n }: { ev: UpcomingEvent; n: number }) {
  const isFed = ev.kind === "fed";
  const d = parseDay(ev.date);
  const soon = n <= 2;

  return (
    <li className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3">
      {/* Date block */}
      <div className="shrink-0 w-11 flex flex-col items-center">
        <div className="text-[9px] tracking-[0.14em] text-white/40 uppercase leading-none">
          {format(d, "MMM")}
        </div>
        <div className="text-[19px] font-semibold tabular-nums leading-tight">
          {format(d, "d")}
        </div>
      </div>

      {/* Icon. -200 fills are remapped to dark inks under :root.light
          in globals.css so the glyph stays legible in both themes. */}
      <div
        className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${
          isFed
            ? "bg-purple-500/15 border-purple-400/40 text-purple-200"
            : "bg-teal-500/15 border-teal-400/40 text-teal-200"
        }`}
      >
        <i
          className={`fa-solid ${isFed ? "fa-landmark" : "fa-bullhorn"} text-[12px]`}
        />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] md:text-[14px] font-medium truncate">
          {isFed ? (
            "FOMC meeting"
          ) : (
            <>
              {ev.symbol} earnings
              {ev.isEstimate && (
                <span className="ml-1.5 text-[10px] text-white/40 font-normal">
                  est.
                </span>
              )}
            </>
          )}
        </div>
        <div className="text-[11px] text-white/45 mt-0.5">
          {format(d, "EEEE")}
        </div>
      </div>

      {/* Relative time */}
      <div
        className={`shrink-0 text-[11px] md:text-[12px] font-medium tabular-nums px-2.5 py-1 rounded-full border ${
          soon
            ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
            : "bg-white/[0.04] text-white/55 border-white/10"
        }`}
      >
        {relativeLabel(n)}
      </div>
    </li>
  );
}
