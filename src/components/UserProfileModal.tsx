"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUserProfile } from "@/hooks/useUserProfile";
import { avatarGradient } from "@/lib/avatarColors";
import { avatarFrameRing } from "@/lib/avatarFrames";
import { useScrollLock } from "@/hooks/useScrollLock";

// A public profile card for a leaderboard user. Opened by tapping a row on
// the leaderboard; all stats are discipline-based (never P/L). Avatar +
// identity on the left, earned medals on the right, stats beneath. Designed
// to grow into the friends feature later (hence the disabled "Add friend").

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

function Medal({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 w-[52px]" title={label}>
      <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-300/25 to-yellow-600/20 border border-amber-400/40 text-amber-300 shadow-[0_2px_10px_rgba(245,158,11,0.15)]">
        <i className={`${icon} text-[15px]`} />
      </div>
      <span className="text-[9px] text-white/50 text-center leading-tight truncate w-full">
        {label}
      </span>
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
            className="w-full max-w-[500px] rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Soft header wash */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(120% 100% at 0% 0%, rgba(45,212,191,0.12), transparent 60%)",
                }}
              />
              <div className="relative flex justify-end p-2">
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
                <div className="px-6 pb-8 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse" />
                    <div className="h-3 w-24 rounded bg-white/[0.05] animate-pulse" />
                  </div>
                </div>
              ) : isError || !p ? (
                <div className="px-6 pb-10 text-center text-[13px] text-white/50">
                  {(error as Error)?.message ?? "Couldn't load this profile."}
                </div>
              ) : (
                <>
                  {/* Top: identity (left) + medals (right) */}
                  <div className="relative px-6 pb-5 flex flex-col sm:flex-row gap-5">
                    {/* Left: avatar + identity + level */}
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left shrink-0 sm:w-[190px]">
                      <div
                        className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient(
                          p.avatarColor,
                        )} ${avatarFrameRing(
                          p.avatarFrame,
                        )} border border-white/15 flex items-center justify-center text-white font-semibold text-2xl`}
                      >
                        {p.name.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="mt-3 text-[17px] font-semibold">
                        {p.name}
                        {p.isMe && <span className="text-teal-300"> (you)</span>}
                      </div>
                      <div className="mt-0.5 text-[12px] text-teal-300">
                        {p.title}
                      </div>

                      <div className="w-full mt-3">
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
                    </div>

                    {/* Right: medals */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] text-white/45">Medals</span>
                        <span className="text-[11px] text-white/45 tabular-nums">
                          {p.medals.length} / {p.medalsTotal}
                        </span>
                      </div>
                      {p.medals.length > 0 ? (
                        <div className="flex flex-wrap gap-x-2 gap-y-3">
                          {p.medals.map((m) => (
                            <Medal key={m.id} icon={m.icon} label={m.label} />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-5 text-center text-[12px] text-white/35">
                          No medals yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Total XP" value={p.totalXp.toLocaleString()} />
                      <Stat
                        label="Trades"
                        value={p.trades.toLocaleString()}
                      />
                      <Stat
                        label="Active days"
                        value={p.activeDays.toLocaleString()}
                      />
                      <Stat label="Challenges" value={p.challengesCompleted} />
                      <Stat label="Streak" value={`${p.streakCurrent}d`} />
                      <Stat label="Best streak" value={`${p.streakLongest}d`} />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      {memberSince && (
                        <span className="text-[11px] text-white/40">
                          Member since {memberSince}
                        </span>
                      )}
                      {!p.isMe && (
                        <button
                          type="button"
                          disabled
                          title="Coming soon"
                          className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/40 text-[12.5px] font-medium cursor-not-allowed"
                        >
                          <i className="fa-solid fa-user-plus text-[11px]" />
                          Add friend
                          <span className="text-[10px] text-white/30">· soon</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
