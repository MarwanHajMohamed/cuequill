"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import { useChallenges, type ChallengeProgress } from "@/hooks/useChallenges";
import { useToast } from "@/hooks/useToast";
import { useTheme } from "@/hooks/useTheme";
import { AVATAR_COLORS } from "@/lib/avatarColors";
import { AVATAR_FRAMES } from "@/lib/avatarFrames";

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

// Levels that unlock a cosmetic reward (colour or frame), ascending.
const REWARD_LEVELS = Array.from(
  new Set(
    [...AVATAR_COLORS, ...AVATAR_FRAMES]
      .filter((x) => x.minLevel > 1)
      .map((x) => x.minLevel),
  ),
).sort((a, b) => a - b);

function Page() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useChallenges();
  const [claiming, setClaiming] = React.useState<string | null>(null);
  const [burst, setBurst] = React.useState<number | null>(null);
  const [equipping, setEquipping] = React.useState(false);

  const equipTitle = async (title: string) => {
    // Toggle: tapping the equipped title clears the nameplate.
    const next = data?.equippedTitle === title ? "" : title;
    setEquipping(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equippedTitle: next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Couldn't equip title");
      toast(next ? `“${next}” equipped` : "Nameplate cleared");
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't equip title");
    } finally {
      setEquipping(false);
    }
  };

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
      const extra =
        d.reward?.kind === "chat"
          ? ` and +${d.reward.amount} Quill messages`
          : "";
      toast(`+${xp} XP claimed${extra}!`);
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
              className="mt-8 relative overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-r from-teal-500/[0.10] to-indigo-500/[0.08] p-5 md:p-7"
            >
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
                  {data.bonusMessages > 0 && (
                    <HeroStat
                      value={data.bonusMessages}
                      label="Bonus msgs"
                      icon="fa-comment-dots"
                    />
                  )}
                  <HeroStat
                    value={data.claimable}
                    label="To claim"
                    icon="fa-gift"
                    pulse={data.claimable > 0}
                  />
                </div>
              </div>
            </motion.div>

            {/* Reward hint — the nearest upcoming cosmetic unlock. */}
            {(() => {
              const upcoming = [
                ...AVATAR_COLORS.map((c) => ({
                  label: c.label,
                  minLevel: c.minLevel,
                  kind: "colour",
                  swatch: `bg-gradient-to-br ${c.gradient}`,
                })),
                ...AVATAR_FRAMES.map((f) => ({
                  label: f.label,
                  minLevel: f.minLevel,
                  kind: "frame",
                  swatch: `bg-gradient-to-br from-slate-500 to-slate-700 ${f.ring}`,
                })),
              ]
                .filter((x) => x.minLevel > data.level)
                .sort((a, b) => a.minLevel - b.minLevel)[0];
              return (
                <div className="mt-4 text-[12px] text-white/55 leading-relaxed">
                  {upcoming ? (
                    <>
                      Reach{" "}
                      <span className="text-white/85 font-semibold">
                        level {upcoming.minLevel}
                      </span>{" "}
                      to unlock the{" "}
                      <span
                        className={`inline-block align-middle w-3.5 h-3.5 rounded-full ${upcoming.swatch} border border-white/25 mx-0.5`}
                      />{" "}
                      <span className="text-white/85 font-semibold">
                        {upcoming.label}
                      </span>{" "}
                      {upcoming.kind} —{" "}
                      <Link
                        href="/settings"
                        className="text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline"
                      >
                        set it in settings
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      You&apos;ve unlocked every reward — set your look in{" "}
                      <Link
                        href="/settings"
                        className="text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline"
                      >
                        settings
                      </Link>
                      .
                    </>
                  )}
                </div>
              );
            })()}

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

            {/* Trophy case — auto-earned milestone trophies. */}
            <section className="mt-10">
              <h2 className="text-[13px] font-semibold text-white/80 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-award text-amber-300/80 text-[12px]" />
                Trophy case
                <span className="text-[11px] text-white/35 tabular-nums font-normal">
                  {data.trophies.filter((t) => t.earned).length}/
                  {data.trophies.length}
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.trophies.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className={`relative flex flex-col items-center text-center gap-2 rounded-2xl border p-4 overflow-hidden ${
                      t.earned
                        ? "border-amber-400/30 bg-gradient-to-b from-amber-500/[0.10] to-transparent"
                        : "border-white/10 bg-white/[0.015] opacity-60"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                        t.earned
                          ? "text-amber-300 bg-amber-500/15 border-amber-400/30"
                          : "text-white/35 bg-white/[0.03] border-white/10"
                      }`}
                    >
                      <i
                        className={`${t.earned ? t.icon : "fa-solid fa-lock"} text-[18px]`}
                      />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold leading-tight">
                        {t.label}
                      </div>
                      <div className="text-[11px] text-white/45 leading-snug mt-0.5">
                        {t.description}
                      </div>
                    </div>
                    {t.title && (
                      <span
                        className={`text-[9.5px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          t.earned
                            ? "text-amber-200/90 border-amber-400/30 bg-amber-500/10"
                            : "text-white/35 border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        Title · {t.title}
                      </span>
                    )}
                    {t.earned && (
                      <i className="fa-solid fa-check absolute top-2.5 right-2.5 text-[10px] text-amber-300/80" />
                    )}
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Nameplate — equip an earned title next to your name. */}
            <section className="mt-10">
              <h2 className="text-[13px] font-semibold text-white/80 mb-1.5 flex items-center gap-2">
                <i className="fa-solid fa-id-badge text-teal-300/80 text-[12px]" />
                Nameplate
              </h2>
              <p className="text-[12px] text-white/50 mb-3 leading-relaxed max-w-lg">
                Pick a title to show beside your name. Earn more by leveling up
                and unlocking trophies. Tap the active one to clear it.
              </p>
              <div className="flex flex-wrap gap-2">
                {data.titles.map((t) => {
                  const active = data.equippedTitle === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => equipTitle(t)}
                      disabled={equipping}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[12.5px] font-medium transition disabled:opacity-60 cursor-pointer ${
                        active
                          ? "border-teal-400/50 bg-teal-500/15 text-teal-200 shadow-[0_0_20px_-6px_rgba(45,212,191,0.5)]"
                          : "border-white/12 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white/90"
                      }`}
                    >
                      <i
                        className={`fa-solid ${active ? "fa-circle-check" : "fa-tag"} text-[10px] ${
                          active ? "text-teal-300" : "text-white/40"
                        }`}
                      />
                      {t}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Rewards ladder — what each level unlocks. */}
            <section className="mt-10">
              <h2 className="text-[13px] font-semibold text-white/80 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-gift text-teal-300/80 text-[12px]" />
                Rewards
              </h2>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
                {REWARD_LEVELS.map((L) => {
                  const colours = AVATAR_COLORS.filter((c) => c.minLevel === L);
                  const frames = AVATAR_FRAMES.filter((f) => f.minLevel === L);
                  const unlocked = data.level >= L;
                  return (
                    <div
                      key={L}
                      className={`flex items-center gap-4 px-4 py-3 ${
                        unlocked ? "" : "opacity-55"
                      }`}
                    >
                      <div
                        className={`shrink-0 w-9 h-9 rounded-lg border flex flex-col items-center justify-center ${
                          unlocked
                            ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                            : "border-white/10 bg-white/[0.03] text-white/45"
                        }`}
                      >
                        <span className="text-[7px] uppercase tracking-wide leading-none">
                          Lvl
                        </span>
                        <span className="text-[13px] font-bold leading-none tabular-nums">
                          {L}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-x-4 gap-y-1.5 flex-wrap">
                        {colours.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 text-[11.5px] text-white/65"
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-gradient-to-br ${c.gradient} border border-white/20`}
                            />
                            {c.label} colour
                          </span>
                        ))}
                        {frames.map((f) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center gap-1.5 text-[11.5px] text-white/65"
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 ${f.ring}`}
                            />
                            {f.label} frame
                          </span>
                        ))}
                      </div>
                      {unlocked ? (
                        <span className="shrink-0 text-[11px] text-teal-300 font-medium inline-flex items-center gap-1">
                          <i className="fa-solid fa-check text-[9px]" /> Unlocked
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] text-white/35 inline-flex items-center gap-1">
                          <i className="fa-solid fa-lock text-[9px]" /> Locked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
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
  const { theme } = useTheme();
  const isLight = theme === "light";
  const style = CAT[c.category] ?? CAT.journaling;
  const shown = Math.min(c.progress, c.target);
  const pct = c.target > 0 ? Math.min(100, (c.progress / c.target) * 100) : 0;
  const claimable = c.complete && !c.claimed;
  const locked = c.locked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.04 }}
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 overflow-hidden ${
        c.claimed
          ? "border-amber-400/30 bg-gradient-to-br from-amber-500/[0.08] to-transparent"
          : claimable
            ? "border-teal-400/40 bg-teal-500/[0.06] shadow-[0_0_30px_-8px_rgba(45,212,191,0.5)]"
            : locked
              ? "border-white/10 bg-white/[0.015] opacity-60"
              : "border-white/10 bg-white/[0.02]"
      }`}
    >
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
          <i
            className={`${
              c.claimed
                ? "fa-solid fa-trophy"
                : locked
                  ? "fa-solid fa-lock"
                  : c.icon
            } text-[15px]`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight">
            {c.title}
          </div>
          <div className="text-[12px] text-white/50 leading-snug mt-0.5">
            {c.description}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span
            className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full border ${style.chip}`}
          >
            +{c.xp}
          </span>
          {c.reward?.kind === "chat" && (
            <span
              title={`${c.reward.amount} bonus Quill AI messages`}
              className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full border bg-violet-500/15 text-violet-300 border-violet-500/30"
            >
              <i className="fa-solid fa-comment-dots text-[8px]" />+
              {c.reward.amount}
            </span>
          )}
        </div>
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
              className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full transition text-[12px] font-bold cursor-pointer disabled:opacity-60 ${
                isLight
                  ? "bg-white text-teal-600 border border-teal-500/40 hover:bg-white"
                  : "bg-teal-400 text-[#04211d] hover:bg-teal-300"
              }`}
            >
              {/* Shimmer confined to the button. */}
              {!claiming && (
                <motion.span
                  aria-hidden
                  className={`pointer-events-none absolute top-0 bottom-0 w-1/3 -skew-x-12 ${
                    isLight ? "bg-teal-300/40" : "bg-white/50"
                  }`}
                  initial={{ left: "-40%" }}
                  animate={{ left: "150%" }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 0.8,
                  }}
                />
              )}
              <span className="relative z-[1] inline-flex items-center gap-1.5">
                {claiming ? (
                  <i className="fa-solid fa-circle-notch animate-spin text-[10px]" />
                ) : (
                  <i className="fa-solid fa-gift text-[10px]" />
                )}
                Claim
              </span>
            </motion.button>
          ) : locked ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
              <i className="fa-solid fa-lock text-[9px]" /> Level {c.minLevel}
            </span>
          ) : (
            <span className="text-[11px] text-white/30">In progress</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default withAuth(Page);
