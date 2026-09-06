"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUserProfile } from "@/hooks/useUserProfile";
import { avatarGradient } from "@/lib/avatarColors";
import { avatarFrameRing } from "@/lib/avatarFrames";
import { useScrollLock } from "@/hooks/useScrollLock";

// A public profile card for a leaderboard user. Opened by tapping a row on
// the leaderboard; all stats are discipline-based (never P/L). Designed to
// grow into the friends feature later (hence the disabled "Add friend").

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10.5px] text-white/45">{label}</div>
      <div className="mt-0.5 text-[16px] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

export default function UserProfileModal({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const open = !!userId;
  useScrollLock(open);
  const { data: p, isLoading, isError, error } = useUserProfile(userId);

  const memberSince = p?.memberSince
    ? new Date(p.memberSince).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "";
  const pct = p && p.per > 0 ? Math.min(100, (p.into / p.per) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Close */}
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-[14px]" />
              </button>
            </div>

            {isLoading ? (
              <div className="px-6 pb-8 flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-white/[0.06] animate-pulse" />
                <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-24 rounded bg-white/[0.05] animate-pulse" />
              </div>
            ) : isError || !p ? (
              <div className="px-6 pb-10 text-center text-[13px] text-white/50">
                {(error as Error)?.message ?? "Couldn't load this profile."}
              </div>
            ) : (
              <div className="px-6 pb-6 flex flex-col items-center">
                {/* Avatar + identity */}
                <div
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient(
                    p.avatarColor,
                  )} ${avatarFrameRing(
                    p.avatarFrame,
                  )} border border-white/15 flex items-center justify-center text-white font-semibold text-2xl`}
                >
                  {p.name.trim().charAt(0).toUpperCase() || "?"}
                </div>
                <div className="mt-3 text-[17px] font-semibold text-center">
                  {p.name}
                  {p.isMe && <span className="text-teal-300"> (you)</span>}
                </div>
                <div className="mt-0.5 text-[12px] text-teal-300 text-center">
                  {p.title}
                </div>

                {/* Level + progress */}
                <div className="w-full mt-4">
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>Level {p.level}</span>
                    <span className="tabular-nums">
                      {p.into} / {p.per} XP
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="w-full mt-4 grid grid-cols-2 gap-2">
                  <Stat label="Total XP" value={p.totalXp.toLocaleString()} />
                  <Stat label="Trades logged" value={p.trades.toLocaleString()} />
                  <Stat label="Active days" value={p.activeDays.toLocaleString()} />
                  <Stat label="Challenges" value={p.challengesCompleted} />
                  <Stat
                    label="Current streak"
                    value={`${p.streakCurrent}d`}
                  />
                  <Stat label="Best streak" value={`${p.streakLongest}d`} />
                </div>

                {memberSince && (
                  <div className="mt-4 text-[11px] text-white/40">
                    Member since {memberSince}
                  </div>
                )}

                {/* Friends: coming soon (placeholder for the upcoming feature). */}
                {!p.isMe && (
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-white/[0.03] text-white/40 text-[13px] font-medium cursor-not-allowed"
                  >
                    <i className="fa-solid fa-user-plus text-[11px]" />
                    Add friend
                    <span className="text-[10px] text-white/30">· soon</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
