"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useFriendAction,
  type FriendAction,
  type FriendStatus,
} from "@/hooks/useFriends";
import { avatarGradient } from "@/lib/avatarColors";
import { avatarFrameRing } from "@/lib/avatarFrames";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTheme } from "@/hooks/useTheme";

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

// Medallion matching the Trophies page: a conic-gradient gold ring with a
// glow, an inner disc holding the icon, and the label beneath.
function Medal({
  icon,
  label,
  isLight,
}: {
  icon: string;
  label: string;
  isLight: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center w-[76px]" title={label}>
      <div
        className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center"
        style={{
          background:
            "conic-gradient(from 140deg, #fcd34d, #f59e0b, #b45309, #fcd34d)",
          boxShadow: "0 0 22px -6px rgba(245,158,11,0.75)",
        }}
      >
        <div
          className={`w-[49px] h-[49px] rounded-full flex items-center justify-center border ${
            isLight
              ? "bg-amber-100 border-amber-400/40 text-amber-700"
              : "bg-[#1a1206] border-amber-300/30 text-amber-200"
          }`}
        >
          <i className={`${icon} text-[19px]`} />
        </div>
      </div>
      <span className="mt-2 text-[10px] text-white/60 leading-tight">
        {label}
      </span>
    </div>
  );
}

// The friend action(s) available for the current relationship. One primary
// button, except an incoming request which offers Accept + Decline.
function FriendControls({
  status,
  pending,
  onAction,
}: {
  status: FriendStatus;
  pending: boolean;
  onAction: (action: FriendAction) => void;
}) {
  const base =
    "inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-medium transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

  if (status === "incoming") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("accept")}
          className={`${base} bg-teal-500 hover:bg-teal-400 text-[#fff]`}
        >
          <i className="fa-solid fa-check text-[11px]" />
          Accept
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("decline")}
          className={`${base} border border-white/12 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/25`}
        >
          Decline
        </button>
      </div>
    );
  }

  if (status === "friends") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => onAction("remove")}
        title="Remove friend"
        className={`${base} group border border-teal-400/30 bg-teal-500/10 text-teal-200 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200`}
      >
        <i className="fa-solid fa-user-check text-[11px]" />
        <span className="group-hover:hidden">Friends</span>
        <span className="hidden group-hover:inline">Remove</span>
      </button>
    );
  }

  if (status === "outgoing") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => onAction("cancel")}
        title="Cancel request"
        className={`${base} border border-white/12 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/25`}
      >
        <i className="fa-solid fa-clock text-[11px]" />
        Requested
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onAction("request")}
      className={`${base} bg-teal-500 hover:bg-teal-400 text-[#fff]`}
    >
      <i className="fa-solid fa-user-plus text-[11px]" />
      Add friend
    </button>
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
  const { theme } = useTheme();
  const isLight = theme === "light";
  const friendMut = useFriendAction();

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
            className="w-full max-w-[620px] rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden"
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
                        <div className="flex flex-wrap gap-x-3 gap-y-4">
                          {p.medals.map((m) => (
                            <Medal
                              key={m.id}
                              icon={m.icon}
                              label={m.label}
                              isLight={isLight}
                            />
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
                        <div className="ml-auto">
                          <FriendControls
                            status={p.friendStatus}
                            pending={friendMut.isPending}
                            onAction={(action) =>
                              friendMut.mutate({ action, userId: p.id })
                            }
                          />
                        </div>
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
