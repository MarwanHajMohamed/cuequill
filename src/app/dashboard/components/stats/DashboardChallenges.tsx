"use client";

import React from "react";
import Link from "next/link";
import { useChallenges } from "@/hooks/useChallenges";
import { CARD_CLASS_BASE } from "../DashboardCard";

// Compact challenges/rewards summary: level + XP progress, claimable count,
// and the challenges nearest to completion. The number shown scales with the
// widget's size — the bigger you make it, the more you see. Links to
// /challenges.
export default function DashboardChallenges({
  rowSpan = 1,
}: {
  rowSpan?: number;
}) {
  const { data, isLoading } = useChallenges();

  if (isLoading || !data) return null;

  const pct = data.per > 0 ? (data.into / data.per) * 100 : 0;
  // Show one challenge per row of height — the list grows downward as the
  // widget gets taller. Width doesn't add rows, so a wide-but-short widget
  // stays a single line instead of overflowing.
  const count = Math.max(1, rowSpan);
  // Closest unclaimed challenges that aren't done yet — the "next up" list.
  const nearest = data.challenges
    .filter((c) => !c.complete && !c.locked)
    .map((c) => ({
      c,
      ratio: c.target > 0 ? c.progress / c.target : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, count)
    .map((x) => x.c);

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
          <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-teal-500/80 to-emerald-600/80 border border-[#ffffff26] flex flex-col items-center justify-center text-[#ffffff]">
            <span className="text-[8px] uppercase tracking-wide text-[#ffffffb3] leading-none">
              Lvl
            </span>
            <span className="text-[15px] font-bold leading-tight tabular-nums text-[#ffffff]">
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

        {nearest.length > 0 && (
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
            {count > 1 && (
              <div className="text-[10px] uppercase tracking-wide text-white/35">
                Closest to completing
              </div>
            )}
            {nearest.map((c) => {
              const p =
                c.target > 0 ? Math.min(100, (c.progress / c.target) * 100) : 0;
              return count === 1 ? (
                <div
                  key={c.id}
                  className="flex items-center gap-2 text-[11.5px] text-white/55"
                >
                  <i className={`${c.icon} text-teal-300/70 text-[11px]`} />
                  <span className="truncate">
                    Next: {c.title}
                    <span className="text-white/35 tabular-nums">
                      {" "}
                      ({Math.min(c.progress, c.target)}/{c.target})
                    </span>
                  </span>
                </div>
              ) : (
                <div key={c.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[11.5px] text-white/60">
                    <i
                      className={`${c.icon} text-teal-300/70 text-[10px] w-3.5 text-center shrink-0`}
                    />
                    <span className="truncate flex-1">{c.title}</span>
                    <span className="text-white/35 tabular-nums shrink-0">
                      {Math.min(c.progress, c.target)}/{c.target}
                    </span>
                  </div>
                  {c.description && (
                    <div className="pl-[22px] text-[10.5px] text-white/40 leading-snug truncate">
                      {c.description}
                    </div>
                  )}
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Link>
  );
}
