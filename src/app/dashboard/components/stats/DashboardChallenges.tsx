"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useChallenges } from "@/hooks/useChallenges";
import { CARD_CLASS_BASE } from "../DashboardCard";

// Compact challenges/rewards summary: level + XP progress, claimable count,
// and the challenges nearest to completion. The list fills whatever height
// the widget has - grow it to see more challenges, shrink it to see fewer -
// never scrolling and never showing a partial row. Links to /challenges.
export default function DashboardChallenges() {
  const { data, isLoading } = useChallenges();

  // Closest unclaimed, unlocked, not-yet-complete challenges - the "next up"
  // list, sorted by how close each is. We render the whole list and hide the
  // rows that don't fit below (see the layout effect), so the widget always
  // uses all its space without scrolling.
  const nearest = useMemo(() => {
    if (!data) return [];
    return data.challenges
      .filter((c) => !c.complete && !c.locked)
      .map((c) => ({ c, ratio: c.target > 0 ? c.progress / c.target : 0 }))
      .sort((a, b) => b.ratio - a.ratio)
      .map((x) => x.c);
  }, [data]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const nearestKey = nearest.map((c) => c.id).join(",");

  // Show every row, then measure and hide from the first row that overflows
  // the visible area onward (no partial rows). Re-runs on resize.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    if (!wrap || !list) return;

    const apply = () => {
      const items = Array.from(list.children) as HTMLElement[];
      items.forEach((el) => (el.style.display = ""));
      const maxBottom = wrap.getBoundingClientRect().top + wrap.clientHeight;
      let overflowed = false;
      for (const el of items) {
        if (overflowed || el.getBoundingClientRect().bottom > maxBottom + 0.5) {
          el.style.display = "none";
          overflowed = true;
        }
      }
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [nearestKey]);

  if (isLoading || !data) return null;

  const pct = data.per > 0 ? (data.into / data.per) * 100 : 0;

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
          <div
            ref={wrapRef}
            className="flex-1 min-h-0 pt-2 border-t border-white/[0.06] overflow-hidden"
          >
            <div ref={listRef} className="flex flex-col gap-2.5">
              {nearest.map((c) => {
                const p =
                  c.target > 0
                    ? Math.min(100, (c.progress / c.target) * 100)
                    : 0;
                return (
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
          </div>
        )}
      </section>
    </Link>
  );
}
