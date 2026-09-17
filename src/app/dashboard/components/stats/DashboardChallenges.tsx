"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useChallenges } from "@/hooks/useChallenges";
import { CARD_CLASS_BASE } from "../DashboardCard";

// Challenges summary: a circular XP ring for the current level, a claimable
// call-to-action, and the challenges nearest to completion. The "up next"
// list fills whatever height the widget has - grow it to see more, shrink to
// see fewer - never scrolling and never showing a partial row. Links to
// /challenges.
export default function DashboardChallenges() {
  const { data, isLoading } = useChallenges();

  // Closest unclaimed, unlocked, not-yet-complete challenges, sorted by how
  // close each is. We render the whole list and hide rows that don't fit
  // (see the layout effect) so the widget always fills its space cleanly.
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

  const pct = data.per > 0 ? Math.min(100, (data.into / data.per) * 100) : 0;
  const toNext = Math.max(0, data.per - data.into);

  // XP ring geometry.
  const R = 20;
  const C = 2 * Math.PI * R;

  return (
    <Link href="/challenges" className="block h-full">
      <section
        className={`${CARD_CLASS_BASE} group flex flex-col gap-3.5 h-full hover:border-white/20 transition`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm md:text-base font-semibold">Challenges</div>
          {data.claimable > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-200 bg-teal-500/15 border border-teal-500/30 rounded-full px-2.5 py-0.5 shadow-[0_0_18px_-6px_rgba(45,212,191,0.6)]">
              <i className="fa-solid fa-gift text-[9px]" />
              {data.claimable} to claim
            </span>
          ) : (
            <i className="fa-solid fa-chevron-right text-[10px] text-white/30 group-hover:text-white/55 transition" />
          )}
        </div>

        {/* Level ring */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-[52px] h-[52px] shrink-0">
            <svg viewBox="0 0 52 52" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="xpring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <circle
                cx="26"
                cy="26"
                r={R}
                fill="none"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="4"
              />
              <circle
                cx="26"
                cy="26"
                r={R}
                fill="none"
                stroke="url(#xpring)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C - (C * pct) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-[8px] uppercase tracking-wide text-white/40">
                Lvl
              </span>
              <span className="text-[15px] font-bold tabular-nums">
                {data.level}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold truncate">
              {data.title}
            </div>
            <div className="mt-0.5 text-[11px] text-white/45 tabular-nums">
              {data.into.toLocaleString()} / {data.per.toLocaleString()} XP
            </div>
            <div className="mt-0.5 text-[10.5px] text-teal-300/80 tabular-nums">
              {toNext.toLocaleString()} XP to level {data.level + 1}
            </div>
          </div>
        </div>

        {/* Up next */}
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 pt-3 border-t border-white/[0.06] overflow-hidden"
        >
          {nearest.length > 0 ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.12em] text-white/35 mb-2.5">
                Up next
              </div>
              <div ref={listRef} className="flex flex-col gap-2.5">
                {nearest.map((c) => {
                  const p =
                    c.target > 0
                      ? Math.min(100, (c.progress / c.target) * 100)
                      : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 shrink-0 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center">
                        <i
                          className={`${c.icon} text-[11px] text-teal-300/80`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-white/75 truncate">
                            {c.title}
                          </span>
                          <span className="text-[10.5px] text-white/40 tabular-nums shrink-0">
                            {Math.min(c.progress, c.target)}/{c.target}
                          </span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1.5 py-2">
              <i className="fa-solid fa-circle-check text-teal-300/70 text-[16px]" />
              <div className="text-[12px] text-white/55">All caught up</div>
              <div className="text-[10.5px] text-white/35">
                New challenges unlock as you level up.
              </div>
            </div>
          )}
        </div>
      </section>
    </Link>
  );
}
