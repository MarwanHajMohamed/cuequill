"use client";

import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { useAffirmations } from "@/hooks/useAffirmations";

function AffirmationsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const {
    affirmations,
    read: serverRead,
    saveList,
    saveRead,
    saving,
  } = useAffirmations();

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

  return (
    <div className="w-full flex flex-col items-center min-h-screen">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0) 75%)",
        }}
      />

      <div className="relative w-full max-w-[1500px] mt-30 px-5 md:px-10">
        {/* Add affirmation */}
        <div className="mt-8 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addAffirmation();
            }}
            placeholder="Write an affirmation to read before you click buy…"
            maxLength={280}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-[14px] text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none transition"
          />
          <button
            onClick={addAffirmation}
            disabled={!draft.trim() || saving}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition ${
              draft.trim() && !saving
                ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
            }`}
          >
            <i className="fa-solid fa-plus text-[11px]" />
            Add
          </button>
        </div>

        {/* Progress */}
        {affirmations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {readCount}
                </span>
                <span className="text-sm text-white/50">
                  of {affirmations.length} read today
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
        )}
      </div>

      {/* Empty state */}
      {affirmations.length === 0 ? (
        <div className="w-full max-w-[1500px] px-5 md:px-10 mt-10 pb-16">
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-300 flex items-center justify-center">
              <i className="fa-solid fa-quote-left text-[16px]" />
            </div>
            <div className="mt-4 text-[15px] font-medium text-white">
              No affirmations yet
            </div>
            <p className="mt-1.5 text-[13px] text-white/50 max-w-sm mx-auto leading-relaxed">
              Add the lines you want to read before you trade — rules,
              reminders, or mantras that keep you disciplined.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[1500px] px-5 md:px-10 mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-16">
          <AnimatePresence initial={false}>
            {affirmations.map((text, i) => {
              const isRead = read.has(text);
              return (
                <motion.div
                  key={text}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={
                    hydrated ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
                  }
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.3,
                    delay: hydrated ? 0.02 * i : 0,
                    ease: "easeOut",
                  }}
                  className={`group relative rounded-2xl border px-5 md:px-6 py-3 md:py-4 transition ${
                    // A lone last card (odd count) spans the full row.
                    i === affirmations.length - 1 && affirmations.length % 2 === 1
                      ? "md:col-span-2"
                      : ""
                  } ${
                    isRead
                      ? "bg-teal-500/[0.06] border-teal-500/25 hover:bg-teal-500/[0.1]"
                      : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20"
                  }`}
                >
                  <button
                    onClick={() => toggle(text)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-[13px] tabular-nums transition ${
                          isRead
                            ? "bg-teal-500 text-white border border-teal-400/40"
                            : "bg-white/5 text-white/60 border border-white/10"
                        }`}
                      >
                        {isRead ? (
                          <i className="fa-solid fa-check text-[12px]" />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </div>
                      <p
                        className={`flex-1 text-[14px] md:text-[15px] leading-relaxed transition pr-6 ${
                          isRead ? "text-white" : "text-white/75"
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
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white/25 opacity-0 group-hover:opacity-100 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
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
