"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import { useChallenges, type ChallengeProgress } from "@/hooks/useChallenges";
import { useToast } from "@/hooks/useToast";

// Per-category flavour so each group has its own colour identity.
const CAT: Record<
  string,
  { label: string; ring: string; bar: string; chip: string; icon: string }
> = {
  onboarding: {
    label: "Getting started",
    ring: "#38bdf8",
    bar: "from-sky-400 to-cyan-400",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    icon: "text-sky-300 bg-sky-500/10 border-sky-500/25",
  },
  journaling: {
    label: "Journaling",
    ring: "#2dd4bf",
    bar: "from-teal-400 to-emerald-400",
    chip: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    icon: "text-teal-300 bg-teal-500/10 border-teal-500/25",
  },
  discipline: {
    label: "Discipline",
    ring: "#f59e0b",
    bar: "from-amber-400 to-orange-400",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  },
  exploration: {
    label: "Exploration",
    ring: "#a78bfa",
    bar: "from-violet-400 to-fuchsia-400",
    chip: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    icon: "text-violet-300 bg-violet-500/10 border-violet-500/25",
  },
};
const CATEGORY_ORDER = ["onboarding", "journaling", "discipline", "exploration"];

function Page() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useChallenges();
  const [claiming, setClaiming] = React.useState<string | null>(null);
  const [burst, setBurst] = React.useState<number | null>(null);

  const claim = async (id: string, xp: number) => {
    setClaiming(id);
    try {
      const res = await fetch("/api/challenges/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Couldn't claim");
      setBurst(xp);
      window.setTimeout(() => setBurst(null), 1400);
      toast(`+${xp} XP claimed!`);
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't claim");
    } finally {
      setClaiming(null);
    }
  };

  const pct = data && data.per > 0 ? (data.into / data.per) * 100 : 0;

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(55% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 72%), radial-gradient(45% 45% at 82% 4%, rgba(129,140,248,0.14) 0%, rgba(129,140,248,0) 72%)",
          }}
        />

        <header className="pb-6 border-b border-white/10">
          <h1 className="text-[24px] font-semibold tracking-tight">
            Challenges
          </h1>
          <p className="text-[13.5px] text-white/50 mt-1.5 leading-relaxed max-w-lg">
            Build good habits, rack up XP, and unlock rewards. Progress tracks
            your real (non-simulated) trades.
          </p>
        </header>

        {/* Floating +XP burst on claim */}
        <AnimatePresence>
          {burst != null && (
            <motion.div
              key="burst"
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: -40, scale: 1.1 }}
              exit={{ opacity: 0, y: -70, scale: 0.9 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="fixed left-1/2 top-1/3 -translate-x-1/2 z-[80] pointer-events-none select-none text-[34px] font-black bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(45,212,191,0.5)]"
            >
              +{burst} XP
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading || !data ? (
          <div className="mt-10 text-[13px] text-white/40">Loading…</div>
        ) : (
          <>
            {/* Level hero with circular XP ring */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-8 relative overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.12] via-transparent to-indigo-500/[0.08] p-5 md:p-7"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-10 w-64 h-64 rounded-full bg-teal-400/15 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-indigo-400/10 blur-3xl"
              />
              <div className="relative flex items-center gap-5 md:gap-7 flex-wrap">
                <LevelRing level={data.level} pct={pct} />
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[20px] md:text-[22px] font-bold tracking-tight bg-gradient-to-r from-teal-200 to-emerald-300 bg-clip-text text-transparent">
                      {data.title}
                    </span>
                    <span className="text-[12px] text-white/45 tabular-nums">
                      · {data.totalXp.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="mt-2.5 h-3 rounded-full bg-white/[0.08] overflow-hidden max-w-md">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-white/50 tabular-nums">
                    {data.into} / {data.per} XP to level {data.level + 1}
                  </div>
                </div>
                <div className="flex items-center gap-6 pr-1">
                  <HeroStat value={data.badges.length} label="Badges" icon="fa-trophy" />
                  <HeroStat
                    value={data.claimable}
                    label="To claim"
                    icon="fa-gift"
                    pulse={data.claimable > 0}
                  />
                </div>
              </div>
            </motion.div>

            {/* Reward hint */}
            <div className="mt-4 flex items-center gap-2 text-[12px] text-white/50">
              <i className="fa-solid fa-wand-magic-sparkles text-teal-300/80 text-[11px]" />
              Level up to unlock new avatar colours — pick yours in{" "}
              <Link
                href="/settings"
                className="text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline"
              >
                settings
              </Link>
              .
            </div>

            {/* Challenges by category */}
            {CATEGORY_ORDER.map((cat) => {
              const items = data.challenges.filter((c) => c.category === cat);
              if (items.length === 0) return null;
              const done = items.filter((c) => c.claimed).length;
              const style = CAT[cat];
              return (
                <section key={cat} className="mt-8">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: style.ring }}
                    />
                    <h2 className="text-[13px] font-semibold text-white/80">
                      {style.label}
                    </h2>
                    <span className="text-[11px] text-white/35 tabular-nums">
                      {done}/{items.length}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((c, i) => (
                      <ChallengeCard
                        key={c.id}
                        c={c}
                        index={i}
                        claiming={claiming === c.id}
                        onClaim={() => claim(c.id, c.xp)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function LevelRing({ level, pct }: { level: number; pct: number }) {
  const r = 33;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative w-[92px] h-[92px] shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="7"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#xpgrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="xpgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-[0.1em] text-white/55 leading-none">
          Lvl
        </span>
        <span className="text-[28px] font-black leading-none tabular-nums">
          {level}
        </span>
      </div>
    </div>
  );
}

function HeroStat({
  value,
  label,
  icon,
  pulse,
}: {
  value: number;
  label: string;
  icon: string;
  pulse?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5">
        <motion.i
          className={`fa-solid ${icon} text-[13px] ${
            pulse ? "text-teal-300" : "text-white/40"
          }`}
          animate={pulse ? { scale: [1, 1.25, 1] } : {}}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className={`text-[22px] font-bold tabular-nums leading-none ${
            pulse ? "text-teal-300" : "text-white"
          }`}
        >
          {value}
        </span>
      </div>
      <div className="text-[10.5px] tracking-wide text-white/45 mt-1.5">
        {label}
      </div>
    </div>
  );
}

function ChallengeCard({
  c,
  index,
  claiming,
  onClaim,
}: {
  c: ChallengeProgress;
  index: number;
  claiming: boolean;
  onClaim: () => void;
}) {
  const style = CAT[c.category] ?? CAT.journaling;
  const shown = Math.min(c.progress, c.target);
  const pct = c.target > 0 ? Math.min(100, (c.progress / c.target) * 100) : 0;
  const claimable = c.complete && !c.claimed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 overflow-hidden ${
        c.claimed
          ? "border-amber-400/30 bg-gradient-to-br from-amber-500/[0.08] to-transparent"
          : claimable
            ? "border-teal-400/40 bg-teal-500/[0.06] shadow-[0_0_30px_-8px_rgba(45,212,191,0.5)]"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {/* Shimmer sweep on claimable cards */}
      {claimable && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.10] to-transparent"
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
        />
      )}

      <div className="relative flex items-start gap-3">
        <div
          className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center ${
            c.claimed
              ? "text-amber-300 bg-amber-500/15 border-amber-400/30"
              : c.complete
                ? style.icon
                : "border-white/10 bg-white/[0.03] text-white/45"
          }`}
        >
          <i className={`${c.claimed ? "fa-solid fa-trophy" : c.icon} text-[15px]`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight">
            {c.title}
          </div>
          <div className="text-[12px] text-white/50 leading-snug mt-0.5">
            {c.description}
          </div>
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full border ${style.chip}`}
        >
          +{c.xp}
        </span>
      </div>

      <div className="relative">
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${
              c.complete ? style.bar : "from-white/25 to-white/20"
            }`}
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-white/45 tabular-nums">
            {shown} / {c.target}
          </span>
          {c.claimed ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-amber-300 font-semibold">
              <i className="fa-solid fa-circle-check text-[10px]" /> Claimed
            </span>
          ) : claimable ? (
            <motion.button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              whileTap={{ scale: 0.94 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-400 text-[#04211d] hover:bg-teal-300 transition text-[12px] font-bold cursor-pointer disabled:opacity-60"
            >
              {claiming ? (
                <i className="fa-solid fa-circle-notch animate-spin text-[10px]" />
              ) : (
                <i className="fa-solid fa-gift text-[10px]" />
              )}
              Claim
            </motion.button>
          ) : (
            <span className="text-[11px] text-white/30">In progress</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default withAuth(Page);
