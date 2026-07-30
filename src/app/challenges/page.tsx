"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import { useChallenges, type ChallengeProgress } from "@/hooks/useChallenges";
import { useToast } from "@/hooks/useToast";
import {
  effectiveCurrent,
  nextStreakMilestone,
  type AffirmationStreak,
} from "@/lib/affirmationStreak";
import RewardsTimeline from "./RewardsTimeline";
import ShareImageModal from "@/components/ShareImageModal";
import AchievementShareCard, {
  CARD_W as ACH_CARD_W,
  CARD_H as ACH_CARD_H,
  type AchievementShareData,
} from "@/components/AchievementShareCard";
import { useCardSkinPrefs } from "@/hooks/useCardSkinPrefs";

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

const todayStr = () => new Date().toISOString().slice(0, 10);

function Page() {
  const qc = useQueryClient();
  const toast = useToast();
  const today = todayStr();
  const { data, isLoading } = useChallenges();
  const [claiming, setClaiming] = React.useState<string | null>(null);
  const [burst, setBurst] = React.useState<number | null>(null);
  const [shareAch, setShareAch] = React.useState<AchievementShareData | null>(
    null,
  );
  const cardSkinPrefs = useCardSkinPrefs();

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
      // A claim can trigger a level-up, which now pays out the bonus chats.
      const extra =
        typeof d.chatGranted === "number" && d.chatGranted > 0
          ? ` · Level up! +${d.chatGranted} Quill messages`
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

        <header className="pb-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">
              Challenges
            </h1>
            <p className="text-[13.5px] text-white/50 mt-1.5 leading-relaxed max-w-lg">
              Build good habits, rack up XP, and unlock rewards.
            </p>
          </div>
          {data && (
            <Link
              href="/trophies"
              className="group shrink-0 inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 hover:border-white/20 transition"
            >
              <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-400/25 text-amber-300 flex items-center justify-center">
                <i className="fa-solid fa-trophy text-[12px]" />
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-[12px] font-medium">Trophy case</span>
                <span className="block text-[10.5px] text-white/40 tabular-nums">
                  {data.trophies.filter((t) => t.earned).length}/
                  {data.trophies.length} earned
                </span>
              </span>
              <i className="fa-solid fa-chevron-right text-[10px] text-white/25 group-hover:text-white/55 transition" />
            </Link>
          )}
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
            {/* Level summary — kept quiet. */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-8 flex items-center gap-4 flex-wrap"
            >
              <LevelRing level={data.level} pct={pct} />
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[16px] md:text-[18px] font-semibold tracking-tight">
                    {data.title}
                  </span>
                  <span className="text-[12px] text-white/45 tabular-nums">
                    · Level {data.level} · {data.totalXp.toLocaleString()} XP
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setShareAch({
                        kind: "level",
                        level: data.level,
                        title: data.title,
                        totalXp: data.totalXp,
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/45 hover:text-white/80 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-share-nodes text-[10px]" />
                    Share
                  </button>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.07] overflow-hidden max-w-md">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-1.5 text-[11.5px] text-white/45 tabular-nums">
                  {data.into} / {data.per} XP to level {data.level + 1}
                </div>
              </div>
              <div className="flex items-center gap-6 pr-1">
                <HeroStat
                  value={data.badges.length}
                  label="Badges"
                  icon="fa-trophy"
                />
                {data.bonusMessages > 0 && (
                  <HeroStat
                    value={data.bonusMessages}
                    label="Bonus msgs"
                    icon="fa-comment-dots"
                  />
                )}
              </div>
            </motion.div>

            {/* Affirmation streak — an auto-awarded XP challenge that advances
                to the next milestone once reached. */}
            <StreakChallengeSection streak={data.streak} today={today} />

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
                        onShare={() =>
                          setShareAch({
                            kind: "challenge",
                            title: c.title,
                            description: c.description,
                            xp: c.xp,
                            level: data.level,
                            levelTitle: data.title,
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Rewards timeline — the level ladder with a modal per level. */}
            <RewardsTimeline
              level={data.level}
              into={data.into}
              per={data.per}
            />
          </>
        )}
      </div>

      {shareAch && (
        <ShareImageModal
          cardW={ACH_CARD_W}
          cardH={ACH_CARD_H}
          fileName={
            shareAch.kind === "level"
              ? `cuequill-level-${shareAch.level}.png`
              : `cuequill-${shareAch.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")}.png`
          }
          shareTitle={
            shareAch.kind === "level"
              ? `Level ${shareAch.level} — Cuequill`
              : `${shareAch.title} — Cuequill`
          }
          shareText={
            shareAch.kind === "level"
              ? `I just reached level ${shareAch.level} (${shareAch.title}) on Cuequill`
              : `I just completed "${shareAch.title}" on Cuequill`
          }
          renderCard={(ref, skin) => (
            <AchievementShareCard ref={ref} data={shareAch} skin={skin} />
          )}
          skinnable
          userLevel={cardSkinPrefs.level}
          initialSkin={cardSkinPrefs.cardSkin}
          onSkinChange={cardSkinPrefs.persist}
          onClose={() => setShareAch(null)}
        />
      )}
    </div>
  );
}

function LevelRing({ level, pct }: { level: number; pct: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative w-[64px] h-[64px] shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#xpgrad)"
          strokeWidth="6"
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
        <span className="text-[7px] uppercase tracking-[0.1em] text-white/50 leading-none">
          Lvl
        </span>
        <span className="text-[20px] font-bold leading-none tabular-nums">
          {level}
        </span>
      </div>
    </div>
  );
}

function StreakChallengeSection({
  streak,
  today,
}: {
  streak: AffirmationStreak;
  today: string;
}) {
  const current = effectiveCurrent(streak, today);
  const next = nextStreakMilestone(streak.longest);
  const maxed = !next;
  const target = next?.days ?? streak.longest;
  const shown = Math.min(current, target);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 100;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "#f59e0b" }}
        />
        <h2 className="text-[13px] font-semibold text-white/80">
          Daily practice
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative flex flex-col gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-4"
        >
          <div className="relative flex items-start gap-3">
            <i className="fa-solid fa-fire shrink-0 text-[18px] text-amber-300 leading-none mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold leading-tight">
                {maxed ? "Streak legend" : `${target}-day affirmation streak`}
              </div>
              <div className="text-[12px] text-white/50 leading-snug mt-0.5">
                {maxed
                  ? "You've earned every streak reward. Legendary."
                  : "Read all your affirmations every day."}
              </div>
            </div>
            {!maxed && (
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-amber-300/90">
                +{next!.xp} XP
              </span>
            )}
          </div>

          <div className="relative">
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-white/45 tabular-nums">
                {maxed ? `${streak.longest} day best` : `${shown} / ${target} days`}
              </span>
              <Link
                href="/affirmations"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-300 hover:text-amber-200 transition"
              >
                Open affirmations
                <i className="fa-solid fa-chevron-right text-[8px]" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
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
  onShare,
}: {
  c: ChallengeProgress;
  index: number;
  claiming: boolean;
  onClaim: () => void;
  onShare: () => void;
}) {
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
        <i
          className={`shrink-0 text-[18px] leading-none mt-0.5 ${
            c.claimed
              ? "fa-solid fa-trophy"
              : locked
                ? "fa-solid fa-lock"
                : c.icon
          }`}
          style={{
            color: c.claimed
              ? "#fbbf24"
              : c.complete
                ? style.ring
                : "rgb(var(--fg-rgb) / 0.4)",
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight">
            {c.title}
          </div>
          <div className="text-[12px] text-white/50 leading-snug mt-0.5">
            {c.description}
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white/45">
          +{c.xp} XP
        </span>
      </div>

      <div className="relative">
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
            <button
              type="button"
              onClick={onShare}
              title="Share this achievement"
              aria-label="Share this achievement"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/12 bg-white/[0.04] text-white/60 hover:text-white hover:border-white/30 transition cursor-pointer"
            >
              <i className="fa-solid fa-share-nodes text-[10px]" />
            </button>
          ) : claimable ? (
            <motion.button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              whileTap={{ scale: 0.94 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="claim-btn relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full transition text-[12px] font-bold cursor-pointer disabled:opacity-60"
            >
              {/* Shimmer confined to the button. */}
              {!claiming && (
                <motion.span
                  aria-hidden
                  className="claim-shimmer pointer-events-none absolute top-0 bottom-0 w-1/3 -skew-x-12"
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
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default withAuth(Page);
