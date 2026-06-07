"use client";

import { withAuth } from "@/lib/withAuth";
import { motion } from "framer-motion";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";

const AFFIRMATIONS = [
  "I'm an excellent manager of my money.",
  "I always pay myself first.",
  "Money works hard for me and produces more and more money.",
  "Everything I do prospers and overwhelms.",
  "I'm a multimillionaire — prosperous and wealthy.",
  "Everything I spend comes back to me multiplied, because I'm the source of all wealth.",
  "Every day, from every point of view, I get better and become more of a multimillionaire.",
  "Fortune comes to me. Money grows in my hand like trees grow in the fields.",
  "Money is important. Money is power and freedom. It helps me be happier and free. I receive it with love.",
  "I play the game of money to win. My objective is creating prosperity, wealth, and abundance.",
];

const storageKey = "affirmations:read";

type ReadState = { date: string; ids: number[] };

const loadReadState = (): ReadState => {
  if (typeof window === "undefined") return { date: "", ids: [] };
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { date: "", ids: [] };
    const parsed = JSON.parse(raw) as ReadState;
    return parsed;
  } catch {
    return { date: "", ids: [] };
  }
};

function AffirmationsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [read, setRead] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = loadReadState();
    if (state.date === today) {
      setRead(new Set(state.ids));
    } else {
      // Stale — drop everything from a previous day.
      localStorage.removeItem(storageKey);
    }
    setHydrated(true);
  }, [today]);

  const persist = (next: Set<number>) => {
    setRead(next);
    localStorage.setItem(
      storageKey,
      JSON.stringify({ date: today, ids: Array.from(next) }),
    );
  };

  const toggle = (idx: number) => {
    const next = new Set(read);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    persist(next);
  };

  const markAll = () => {
    persist(new Set(AFFIRMATIONS.map((_, i) => i)));
  };

  const clearAll = () => {
    persist(new Set());
  };

  const progress = useMemo(
    () => (read.size / AFFIRMATIONS.length) * 100,
    [read],
  );

  const allRead = read.size === AFFIRMATIONS.length;

  return (
    <div className="w-full flex flex-col items-center min-h-screen">
      {/* Aurora — fixed to the viewport so the gradient feathers to
          full transparency in every direction. No container edges to
          cut against. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0) 75%)",
        }}
      />

      {/* HERO — left-aligned, same hero language as the Trades page. */}
      <div className="relative w-full max-w-[1500px] mt-30 px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-2"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            Morning ritual
          </div>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Daily affirmations
              </span>
            </h1>
            <div className="text-[12px] text-white/45 tabular-nums">
              {read.size} of {AFFIRMATIONS.length} read
            </div>
          </div>
          <p className="text-[13px] md:text-[14px] text-white/55 max-w-xl leading-relaxed mt-1">
            Read each one out loud. Mean it. Tap to mark as read — the list
            resets at midnight.
          </p>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {read.size}
              </span>
              <span className="text-sm text-white/50">
                of {AFFIRMATIONS.length} read today
              </span>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              {allRead ? (
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition"
                >
                  Reset
                </button>
              ) : (
                <button
                  onClick={markAll}
                  className="px-3 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
              className={`h-full rounded-full ${
                allRead
                  ? "bg-gradient-to-r from-green-400 to-emerald-400"
                  : "bg-gradient-to-r from-teal-400 to-emerald-400"
              }`}
            />
          </div>
        </motion.div>
      </div>

      {/* LIST */}
      <div className="w-full max-w-[1500px] px-5 md:px-10 mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-16">
        {AFFIRMATIONS.map((text, i) => {
          const isRead = read.has(i);
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={
                hydrated ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
              }
              transition={{
                duration: 0.35,
                delay: 0.04 * i,
                ease: "easeOut",
              }}
              onClick={() => toggle(i)}
              className={`group relative text-left rounded-2xl border p-5 md:p-6 transition cursor-pointer ${
                isRead
                  ? "bg-teal-500/[0.06] border-teal-500/25 hover:bg-teal-500/[0.1]"
                  : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-[13px] tabular-nums transition ${
                    isRead
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-white/5 text-white/60 border border-white/10"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p
                  className={`flex-1 text-[14px] md:text-[15px] leading-relaxed transition ${
                    isRead ? "text-white" : "text-white/75"
                  }`}
                >
                  {text}
                </p>
                <div
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition ${
                    isRead
                      ? "bg-teal-500 text-white"
                      : "bg-white/5 border border-white/15 text-transparent group-hover:text-white/40"
                  }`}
                  aria-hidden
                >
                  <i className="fa-solid fa-check" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default withAuth(AffirmationsPage);
