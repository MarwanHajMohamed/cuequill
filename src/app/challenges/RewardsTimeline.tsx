"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MAX_LEVEL,
  rewardsForLevel,
  titleForLevel,
  type LevelReward,
} from "@/lib/levelRewards";

const ROW_H = 118; // px per level — equal so the spine fill lines up with nodes

// The rewards ladder as a vertical timeline: a progress-bar spine down the
// middle (filled to the user's current level), alternating cards left/right,
// each showing the headline reward for that level with a button to see the
// rest in a modal.
export default function RewardsTimeline({
  level,
  into,
  per,
}: {
  level: number;
  into: number;
  per: number;
}) {
  const [openLevel, setOpenLevel] = React.useState<number | null>(null);

  const levels = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

  // Fill fraction of the spine: to the current level's node centre, plus the
  // fractional progress into the next level.
  const frac = per > 0 ? Math.min(1, Math.max(0, into / per)) : 0;
  const units = Math.min(level - 1 + frac, MAX_LEVEL - 1);
  const fillPct = Math.min(100, ((units + 0.5) / MAX_LEVEL) * 100);

  return (
    <section className="mt-10">
      <h2 className="text-[13px] font-semibold text-white/80 mb-1.5 flex items-center gap-2">
        <i className="fa-solid fa-gift text-teal-300/80 text-[12px]" />
        Rewards
      </h2>
      <p className="text-[12px] text-white/50 mb-5 leading-relaxed max-w-lg">
        Level up to unlock cosmetics, titles and bonus Quill AI messages. Each
        stop shows one reward — tap “See all” for everything at that level.
      </p>

      <div
        className="relative"
        style={{ height: levels.length * ROW_H }}
      >
        {/* Spine track */}
        <div className="absolute top-0 bottom-0 left-6 md:left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-white/10" />
        {/* Spine fill */}
        <div
          className="absolute top-0 left-6 md:left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-gradient-to-b from-teal-400 to-emerald-400"
          style={{ height: `${fillPct}%` }}
        />

        {levels.map((L, i) => {
          const rewards = rewardsForLevel(L);
          const headline = rewards[0] ?? null;
          const unlocked = level >= L;
          const isCurrent = level === L;
          const leftSide = i % 2 === 0; // alternate on desktop

          const cardPos = leftSide
            ? "left-16 right-2 md:left-auto md:right-1/2 md:mr-8 md:w-[300px]"
            : "left-16 right-2 md:right-auto md:left-1/2 md:ml-8 md:w-[300px]";

          return (
            <div
              key={L}
              className="absolute inset-x-0"
              style={{ top: i * ROW_H, height: ROW_H }}
            >
              {/* Node marker. An opaque disc sits under the tinted circle so
                  the spine line is hidden behind it (the tints are
                  translucent and would otherwise show the line over the
                  number). */}
              <div className="absolute left-6 md:left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
                <div className="rounded-full bg-[var(--background)]">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center transition ${
                      isCurrent
                        ? "border-teal-400 bg-teal-500/25 text-teal-200 shadow-[0_0_18px_-2px_rgba(45,212,191,0.7)]"
                        : unlocked
                          ? "border-teal-500/50 bg-teal-500/12 text-teal-200"
                          : "border-white/15 bg-[var(--surface)] text-white/45"
                    }`}
                  >
                    <span className="text-[6.5px] uppercase tracking-wide leading-none opacity-70">
                      Lvl
                    </span>
                    <span className="text-[13px] font-bold leading-none tabular-nums">
                      {L}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 ${cardPos}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-xl border p-3 ${
                    unlocked
                      ? "border-teal-500/25 bg-teal-500/[0.06]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[13px] font-semibold">
                      Level {L}
                    </span>
                    <span className="text-[11px] text-white/45">
                      {titleForLevel(L)}
                    </span>
                    {unlocked ? (
                      <i className="fa-solid fa-circle-check text-[11px] text-teal-300 ml-auto" />
                    ) : (
                      <i className="fa-solid fa-lock text-[10px] text-white/30 ml-auto" />
                    )}
                  </div>

                  {headline ? (
                    <div className="flex items-center gap-2">
                      <RewardSwatch reward={headline} />
                      <span
                        className={`text-[12px] leading-snug ${
                          unlocked ? "text-white/80" : "text-white/55"
                        }`}
                      >
                        {headline.label}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11.5px] text-white/40">
                      Where every journey begins.
                    </div>
                  )}

                  {rewards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setOpenLevel(L)}
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-300 hover:text-teal-200 transition cursor-pointer"
                    >
                      See all {rewards.length} rewards
                      <i className="fa-solid fa-chevron-right text-[8px]" />
                    </button>
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: all rewards at a level */}
      <AnimatePresence>
        {openLevel != null && (
          <RewardsModal
            level={openLevel}
            unlocked={level >= openLevel}
            onClose={() => setOpenLevel(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function RewardsModal({
  level,
  unlocked,
  onClose,
}: {
  level: number;
  unlocked: boolean;
  onClose: () => void;
}) {
  const rewards = rewardsForLevel(level);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] modal-scrim backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_60px_var(--shadow)] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div
            className={`w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center ${
              unlocked
                ? "border-teal-500/50 bg-teal-500/12 text-teal-200"
                : "border-white/15 bg-white/[0.03] text-white/45"
            }`}
          >
            <span className="text-[6.5px] uppercase tracking-wide leading-none opacity-70">
              Lvl
            </span>
            <span className="text-[13px] font-bold leading-none tabular-nums">
              {level}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold leading-tight">
              Level {level} rewards
            </div>
            <div className="text-[11.5px] text-white/45">
              {titleForLevel(level)}
              {unlocked ? " · unlocked" : " · locked"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto shrink-0 w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:border-white/25 transition flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-[12px]" />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-1">
          {rewards.length === 0 ? (
            <div className="px-2 py-6 text-center text-[12.5px] text-white/45">
              Your starting level — no unlocks here.
            </div>
          ) : (
            rewards.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition"
              >
                <RewardSwatch reward={r} />
                <span className="text-[13px] text-white/85">{r.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-white/35">
                  {rewardKindLabel(r)}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function rewardKindLabel(r: LevelReward): string {
  switch (r.kind) {
    case "chat":
      return "Quill";
    case "title":
      return "Title";
    case "color":
      return "Avatar";
    case "frame":
      return "Frame";
    case "accent":
      return "Accent";
    case "skin":
      return "Skin";
  }
}

// A small preview swatch/icon for a reward, matching its kind.
function RewardSwatch({ reward }: { reward: LevelReward }) {
  const base = "w-7 h-7 rounded-full shrink-0 flex items-center justify-center";
  switch (reward.kind) {
    case "color":
      return (
        <span
          className={`${base} bg-gradient-to-br ${reward.gradient} border border-white/20`}
        />
      );
    case "accent":
      return (
        <span
          className={`${base} bg-gradient-to-br ${reward.swatch} border border-white/20`}
        />
      );
    case "frame":
      return (
        <span
          className={`${base} bg-gradient-to-br from-slate-500 to-slate-700 ${reward.ring}`}
        />
      );
    case "skin":
      return (
        <span
          className={`${base} border border-white/20`}
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${reward.swatchFrom}, ${reward.swatchTo})`,
          }}
        />
      );
    case "chat":
      return (
        <span
          className={`${base} bg-violet-500/15 border border-violet-500/30 text-violet-300`}
        >
          <i className="fa-solid fa-comment-dots text-[11px]" />
        </span>
      );
    case "title":
      return (
        <span
          className={`${base} bg-amber-500/15 border border-amber-400/30 text-amber-300`}
        >
          <i className="fa-solid fa-id-badge text-[11px]" />
        </span>
      );
  }
}
