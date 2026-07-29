"use client";

import React from "react";
import Link from "next/link";
import { useChallenges } from "@/hooks/useChallenges";
import { CARD_CLASS_BASE } from "../DashboardCard";

// Compact challenges/rewards summary: level + XP progress, claimable
// count, and the nearest challenge in progress. Links to /challenges.
export default function DashboardChallenges() {
  const { data, isLoading } = useChallenges();

  if (isLoading || !data) return null;

  const pct = data.per > 0 ? (data.into / data.per) * 100 : 0;
  // Closest unclaimed challenge that isn't done yet — the "next up".
  const nextUp = data.challenges
    .filter((c) => !c.complete)
    .map((c) => ({
      c,
      ratio: c.target > 0 ? c.progress / c.target : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)[0]?.c;

  return (
    <Link href="/challenges" className="block h-full">
      <section
        className={`${CARD_CLASS_BASE} flex flex-col gap-3 h-full hover:border-white/20 transition`}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm md:text-base font-semibold">Challenges</div>
          {data.claimable > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-300 bg-teal-500/15 border border-teal-500/30 rounded-full px-2 py-0.5">
              <i className="fa-solid fa-gift text-[9px]" /> {data.claimable} to
              claim
            </span>
          ) : (
            <i className="fa-solid fa-chevron-right text-[10px] text-white/30" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-teal-500/80 to-emerald-600/80 border border-white/15 flex flex-col items-center justify-center text-white">
            <span className="text-[8px] uppercase tracking-wide text-white/70 leading-none">
              Lvl
            </span>
            <span className="text-[15px] font-bold leading-tight tabular-nums">
              {data.level}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium">{data.title}</div>
            <div className="mt-1.5 h-2 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 text-[10.5px] text-white/45 tabular-nums">
              {data.into} / {data.per} XP
            </div>
          </div>
        </div>

        {nextUp && (
          <div className="mt-auto pt-1 border-t border-white/[0.06] flex items-center gap-2 text-[11.5px] text-white/55">
            <i className={`${nextUp.icon} text-teal-300/70 text-[11px]`} />
            <span className="truncate">
              Next: {nextUp.title}
              <span className="text-white/35 tabular-nums">
                {" "}
                ({Math.min(nextUp.progress, nextUp.target)}/{nextUp.target})
              </span>
            </span>
          </div>
        )}
      </section>
    </Link>
  );
}
