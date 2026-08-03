"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { withAuth } from "@/lib/withAuth";
import {
  useLeaderboard,
  useLeaderboardOptIn,
  type LeaderboardEntry,
} from "@/hooks/useLeaderboard";
import { avatarGradient } from "@/lib/avatarColors";
import { avatarFrameRing } from "@/lib/avatarFrames";
import { Skeleton } from "@/components/Loaders";

// The three ranking boards. Every metric is process / discipline based —
// consistency of journaling, never P/L — so climbing rewards good habits.
type BoardId = "level" | "trades" | "streak";

const BOARDS: {
  id: BoardId;
  label: string;
  icon: string;
  accent: string; // ring / accent hex
  unit: string;
  // Pull the sort value + the display value for an entry.
  value: (e: LeaderboardEntry) => number;
  primary: (e: LeaderboardEntry) => string;
  secondary: (e: LeaderboardEntry) => string;
}[] = [
  {
    id: "level",
    label: "Level",
    icon: "fa-solid fa-chart-line",
    accent: "#2dd4bf",
    unit: "XP",
    value: (e) => e.totalXp,
    primary: (e) => `Lvl ${e.level}`,
    secondary: (e) => `${e.totalXp.toLocaleString()} XP`,
  },
  {
    id: "trades",
    label: "Trades logged",
    icon: "fa-solid fa-chart-column",
    accent: "#818cf8",
    unit: "trades",
    value: (e) => e.trades,
    primary: (e) => e.trades.toLocaleString(),
    secondary: (e) => (e.trades === 1 ? "trade" : "trades"),
  },
  {
    id: "streak",
    label: "Streak",
    icon: "fa-solid fa-fire",
    accent: "#fb923c",
    unit: "days",
    value: (e) => e.streak,
    primary: (e) => String(e.streak),
    secondary: (e) => (e.streak === 1 ? "day" : "days"),
  },
];

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Avatar({
  entry,
  size = 40,
}: {
  entry: LeaderboardEntry;
  size?: number;
}) {
  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br ${avatarGradient(
        entry.avatarColor,
      )} ${avatarFrameRing(
        entry.avatarFrame,
      )} border border-white/15 flex items-center justify-center font-semibold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initial(entry.name)}
    </div>
  );
}

const MEDAL = ["#facc15", "#cbd5e1", "#d08b5b"]; // gold, silver, bronze

function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();
  const optInMut = useLeaderboardOptIn();
  const [board, setBoard] = useState<BoardId>("level");

  const active = BOARDS.find((b) => b.id === board)!;

  const ranked = useMemo(() => {
    const entries = [...(data?.entries ?? [])];
    entries.sort((a, b) => {
      const d = active.value(b) - active.value(a);
      if (d !== 0) return d;
      // Stable, sensible tie-breakers: higher XP, then name.
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
      return a.name.localeCompare(b.name);
    });
    return entries;
  }, [data?.entries, active]);

  const myRank = useMemo(() => {
    const idx = ranked.findIndex((e) => e.isMe);
    return idx === -1 ? null : idx + 1;
  }, [ranked]);

  const optedIn = data?.optedIn ?? false;
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        {/* Ambient background wash */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(700px 340px at 78% -8%, rgba(45,212,191,0.10), transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight flex items-center gap-2.5">
              <i className="fa-solid fa-ranking-star text-teal-300" />
              Leaderboard
            </h1>
            <p className="mt-1.5 text-[13px] md:text-sm text-white/55 max-w-xl">
              Ranked by consistency, not profit.
            </p>
          </div>

          {myRank && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                Your rank
              </div>
              <div className="text-xl font-semibold tabular-nums text-teal-300">
                #{myRank}
              </div>
            </div>
          )}
        </div>

        {/* Opt-in banner */}
        {!isLoading && !optedIn && (
          <div className="mt-5 rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] px-4 md:px-5 py-4 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-teal-500/15 border border-teal-500/25 text-teal-300 flex items-center justify-center">
              <i className="fa-solid fa-user-plus text-[15px]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium">
                You&apos;re not on the leaderboard yet
              </div>
              <p className="text-[12.5px] text-white/55 mt-0.5">
                Join to appear in the rankings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => optInMut.mutate(true)}
              disabled={optInMut.isPending}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-[13px] font-semibold transition disabled:opacity-60 cursor-pointer"
            >
              <i className="fa-solid fa-ranking-star text-[12px]" />
              Join leaderboard
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-2xl border border-white/10 bg-white/[0.03] self-start">
          {BOARDS.map((b) => {
            const on = b.id === board;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBoard(b.id)}
                className={`relative inline-flex items-center gap-2 px-3.5 md:px-4 py-2 rounded-xl text-[12.5px] md:text-[13px] font-medium transition cursor-pointer ${
                  on ? "text-white" : "text-white/55 hover:text-white/80"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="lb-tab"
                    className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/10"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <i
                  className={`${b.icon} text-[12px] relative`}
                  style={{ color: on ? b.accent : undefined }}
                />
                <span className="relative">{b.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="mt-5">
          {isLoading ? (
            <LeaderboardSkeleton />
          ) : ranked.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {/* Podium */}
              {podium.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 md:gap-4 items-end">
                  {/* Order visually as 2 · 1 · 3 for a real podium */}
                  {[podium[1], podium[0], podium[2]].map((e, col) =>
                    e ? (
                      <PodiumCard
                        key={e.id}
                        entry={e}
                        rank={col === 1 ? 1 : col === 0 ? 2 : 3}
                        board={active}
                        tall={col === 1}
                      />
                    ) : (
                      <div key={col} />
                    ),
                  )}
                </div>
              )}

              {/* Remaining ranks */}
              {rest.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
                  <AnimatePresence initial={false}>
                    {rest.map((e, i) => (
                      <Row
                        key={e.id}
                        entry={e}
                        rank={i + 4}
                        board={active}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Leave link for opted-in users */}
              {optedIn && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => optInMut.mutate(false)}
                    disabled={optInMut.isPending}
                    className="text-[12px] text-white/40 hover:text-white/70 transition cursor-pointer disabled:opacity-60"
                  >
                    Leave the leaderboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  board,
  tall,
}: {
  entry: LeaderboardEntry;
  rank: number;
  board: (typeof BOARDS)[number];
  tall: boolean;
}) {
  const medal = MEDAL[rank - 1];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border p-3 md:p-4 flex flex-col items-center text-center ${
        tall ? "md:pt-6" : ""
      } ${
        entry.isMe
          ? "border-teal-400/40 bg-teal-500/[0.07]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-black tabular-nums shadow"
        style={{ background: medal }}
      >
        {rank}
      </div>
      <div className="relative mt-1">
        <Avatar entry={entry} size={tall ? 60 : 48} />
        <i
          className="fa-solid fa-crown absolute -top-3 left-1/2 -translate-x-1/2 text-[13px]"
          style={{ color: medal, opacity: rank === 1 ? 1 : 0 }}
        />
      </div>
      <div className="mt-2 text-[13px] md:text-[14px] font-semibold truncate max-w-full">
        {entry.name}
        {entry.isMe && <span className="text-teal-300"> (you)</span>}
      </div>
      <div className="text-[10.5px] text-white/45 truncate max-w-full">
        {entry.title}
      </div>
      <div
        className="mt-2 text-lg md:text-xl font-bold tabular-nums"
        style={{ color: board.accent }}
      >
        {board.primary(entry)}
      </div>
      <div className="text-[10.5px] text-white/45">{board.secondary(entry)}</div>
    </motion.div>
  );
}

function Row({
  entry,
  rank,
  board,
}: {
  entry: LeaderboardEntry;
  rank: number;
  board: (typeof BOARDS)[number];
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-3 md:gap-4 px-3.5 md:px-4 py-3 ${
        entry.isMe ? "bg-teal-500/[0.07]" : ""
      }`}
    >
      <div className="w-7 md:w-8 shrink-0 text-center text-[13px] font-semibold tabular-nums text-white/45">
        {rank}
      </div>
      <Avatar entry={entry} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] md:text-[14px] font-medium truncate">
          {entry.name}
          {entry.isMe && <span className="text-teal-300"> (you)</span>}
        </div>
        <div className="text-[11px] text-white/45 truncate">{entry.title}</div>
      </div>
      <div className="shrink-0 text-right">
        <div
          className="text-[14px] md:text-[15px] font-semibold tabular-nums"
          style={{ color: board.accent }}
        >
          {board.primary(entry)}
        </div>
        <div className="text-[10.5px] text-white/40">
          {board.secondary(entry)}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-300 flex items-center justify-center">
        <i className="fa-solid fa-ranking-star text-[17px]" />
      </div>
      <p className="mt-3 text-[13.5px] text-white/60 max-w-sm mx-auto">
        No one&apos;s on the board yet. Be the first to join and set the pace.
      </p>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2.5 md:gap-4 items-end">
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            className={`rounded-2xl ${i === 1 ? "h-44" : "h-36"}`}
          />
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/[0.06]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="w-6 h-4 rounded" />
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="flex-1">
              <Skeleton className="w-32 h-3.5 rounded" />
              <Skeleton className="w-20 h-2.5 rounded mt-1.5" />
            </div>
            <Skeleton className="w-12 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuth(LeaderboardPage);
