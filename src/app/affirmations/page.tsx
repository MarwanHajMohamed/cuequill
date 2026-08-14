"use client";

import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { useAffirmations } from "@/hooks/useAffirmations";
import { useToast } from "@/hooks/useToast";
import {
  effectiveCurrent,
  nextStreakMilestone,
} from "@/lib/affirmationStreak";

function AffirmationsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const toast = useToast();
  const {
    affirmations,
    read: serverRead,
    streak,
    saveList,
    saveRead,
    saving,
  } = useAffirmations((xp) => toast(`+${xp} XP · streak milestone!`));

  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => setHydrated(true), []);

  // Read-state comes from the server (synced across devices), scoped by
  // the client's local day. Keyed by affirmation text so it survives
  // add/remove; stale entries are ignored and clear on the daily reset.
  const read = useMemo(
    () => new Set(serverRead.date === today ? serverRead.texts : []),
    [serverRead, today],
  );

  const commitRead = (next: Set<string>) =>
    saveRead({ date: today, texts: Array.from(next) });

  const toggle = (text: string) => {
    const next = new Set(read);
    if (next.has(text)) next.delete(text);
    else next.add(text);
    commitRead(next);
  };

  const markAll = () => commitRead(new Set(affirmations));
  const clearAll = () => commitRead(new Set());

  const addAffirmation = () => {
    const text = draft.trim();
    if (!text) return;
    if (affirmations.some((a) => a.toLowerCase() === text.toLowerCase())) {
      setDraft("");
      return;
    }
    saveList([...affirmations, text]);
    setDraft("");
  };

  const removeAffirmation = (text: string) => {
    saveList(affirmations.filter((a) => a !== text));
  };

  // Count only current affirmations as read so removed lines don't skew it.
  const readCount = useMemo(
    () => affirmations.filter((a) => read.has(a)).length,
    [affirmations, read],
  );
  const progress =
    affirmations.length > 0 ? (readCount / affirmations.length) * 100 : 0;
  const allRead = affirmations.length > 0 && readCount === affirmations.length;

  // Live current streak: the stored run only counts if completed today or
  // yesterday. Reflect an in-progress completion immediately (allRead) even
  // before the server round-trip lands.
  const currentStreak = useMemo(() => {
    const live = effectiveCurrent(streak, today);
    if (allRead && streak.lastDate !== today) return live + 1;
    return live;
  }, [streak, today, allRead]);

  // Next streak XP milestone (based on best-ever, since milestones pay once).
  const nextMilestone = useMemo(
    () => nextStreakMilestone(Math.max(currentStreak, streak.longest)),
    [currentStreak, streak.longest],
  );

  return (
    <div className="w-full flex justify-center min-h-screen">
      {/* Subtle aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(45% 40% at 50% 0%, rgba(20,184,166,0.10) 0%, rgba(20,184,166,0) 70%)",
        }}
      />

      <div className="w-full max-w-2xl px-5 md:px-8 pt-24 md:pt-12 pb-24">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight flex items-center gap-2.5">
              <i className="fa-regular fa-circle-check text-teal-300" />
              Affirmations
            </h1>
            <p className="mt-1.5 text-[13px] text-white/45 leading-relaxed">
              The lines you read before you click buy.
            </p>
          </div>

          {affirmations.length > 0 && (
            <div
              title={`Best streak: ${Math.max(streak.longest, currentStreak)} days`}
              className={`shrink-0 mt-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                currentStreak > 0
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-white/[0.04] text-white/40"
              }`}
            >
              <i className="fa-solid fa-fire text-[12px]" />
              <span className="tabular-nums">{currentStreak}</span>
              <span className="font-normal text-white/40">
                day{currentStreak === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </header>

        {/* Add affirmation */}
        <div className="mt-8 relative">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addAffirmation();
            }}
            placeholder="Write an affirmation…"
            maxLength={280}
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[14px] text-white placeholder:text-white/30 focus:border-teal-500/40 focus:bg-white/[0.04] focus:outline-none transition"
          />
          <button
            onClick={addAffirmation}
            disabled={!draft.trim() || saving}
            aria-label="Add affirmation"
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg inline-flex items-center justify-center transition ${
              draft.trim() && !saving
                ? "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 cursor-pointer"
                : "text-white/25 cursor-not-allowed"
            }`}
          >
            <i className="fa-solid fa-plus text-[12px]" />
          </button>
        </div>

        {/* Progress + milestone */}
        {affirmations.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-[13px] text-white/50">
                <span className="text-white font-semibold tabular-nums">
                  {readCount}
                </span>{" "}
                of {affirmations.length} read today
              </div>
              {allRead ? (
                <button
                  onClick={clearAll}
                  className="text-[12px] text-white/45 hover:text-white transition cursor-pointer"
                >
                  Reset
                </button>
              ) : (
                <button
                  onClick={markAll}
                  className="text-[12px] text-teal-300 hover:text-teal-200 transition cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
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

            {nextMilestone && (
              <div className="mt-2.5 text-[11.5px] text-white/40 flex items-center gap-1.5">
                <i className="fa-solid fa-bolt text-[10px] text-amber-300/70" />
                <span>
                  <span className="text-white/60 font-medium">
                    +{nextMilestone.xp} XP
                  </span>{" "}
                  at a {nextMilestone.days}-day streak
                  {(() => {
                    const best = Math.max(currentStreak, streak.longest);
                    const togo = nextMilestone.days - best;
                    return togo > 0 ? (
                      <span className="text-white/30">
                        {" "}
                        · {togo} day{togo === 1 ? "" : "s"} to go
                      </span>
                    ) : null;
                  })()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Empty state or list */}
        {affirmations.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
              <i className="fa-solid fa-quote-left text-[15px]" />
            </div>
            <div className="mt-4 text-[15px] font-medium text-white">
              No affirmations yet
            </div>
            <p className="mt-1.5 text-[13px] text-white/45 max-w-xs mx-auto leading-relaxed">
              Add the lines you want to read before you trade — rules,
              reminders, or mantras that keep you disciplined.
            </p>
          </div>
        ) : (
          <div className="mt-8 border-t border-white/[0.08]">
            <AnimatePresence initial={false}>
              {affirmations.map((text, i) => {
                const isRead = read.has(text);
                return (
                  <motion.div
                    key={text}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={
                      hydrated ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
                    }
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.28,
                      delay: hydrated ? 0.015 * i : 0,
                      ease: "easeOut",
                    }}
                    className="group relative border-b border-white/[0.08]"
                  >
                    <button
                      onClick={() => toggle(text)}
                      className="w-full text-left cursor-pointer px-1 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium tabular-nums transition ${
                            isRead
                              ? "bg-teal-500 text-white"
                              : "border border-white/15 text-white/40"
                          }`}
                        >
                          {isRead ? (
                            <i className="fa-solid fa-check text-[11px]" />
                          ) : (
                            i + 1
                          )}
                        </div>
                        <p
                          className={`flex-1 text-[14px] md:text-[15px] leading-relaxed transition pr-8 ${
                            isRead ? "text-white/90" : "text-white/70"
                          }`}
                        >
                          {text}
                        </p>
                      </div>
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeAffirmation(text)}
                      aria-label="Remove affirmation"
                      className="absolute top-1/2 -translate-y-1/2 right-1 w-7 h-7 rounded-full flex items-center justify-center text-white/25 opacity-0 group-hover:opacity-100 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark text-[11px]" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function GatedAffirmationsPage() {
  return (
    <ProGate
      feature="Affirmations"
      description="Pin the lines you need to read before you click buy. Available on Pro."
      className="min-h-screen"
    >
      <AffirmationsPage />
    </ProGate>
  );
}

export default withAuth(GatedAffirmationsPage);
