"use client";

import React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import { useChallenges, type ChallengeProgress } from "@/hooks/useChallenges";
import { useToast } from "@/hooks/useToast";

const CATEGORY_LABEL: Record<string, string> = {
  onboarding: "Getting started",
  journaling: "Journaling",
  discipline: "Discipline",
  exploration: "Exploration",
};
const CATEGORY_ORDER = ["onboarding", "journaling", "discipline", "exploration"];

function Page() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useChallenges();
  const [claiming, setClaiming] = React.useState<string | null>(null);

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
      toast(`+${xp} XP claimed 🎉`);
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
              "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
          }}
        />

        <header className="pb-6 border-b border-white/10">
          <h1 className="text-[24px] font-semibold tracking-tight">Challenges</h1>
          <p className="text-[13.5px] text-white/50 mt-1.5 leading-relaxed max-w-lg">
            Build good habits, earn XP, and unlock rewards. Challenges track
            your real (non-simulated) trades.
          </p>
        </header>

        {isLoading || !data ? (
          <div className="mt-10 text-[13px] text-white/40">Loading…</div>
        ) : (
          <>
            {/* Level hero */}
            <div className="mt-8 relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.10] via-transparent to-indigo-500/[0.06] p-5 md:p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-10 w-52 h-52 rounded-full bg-teal-400/15 blur-3xl"
              />
              <div className="relative flex items-center gap-5 flex-wrap">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-teal-500/80 to-emerald-600/80 border border-white/15 flex flex-col items-center justify-center text-white">
                  <span className="text-[10px] uppercase tracking-wide text-white/70 leading-none">
                    Lvl
                  </span>
                  <span className="text-[22px] font-bold leading-tight tabular-nums">
                    {data.level}
                  </span>
                </div>
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[18px] font-semibold">
                      {data.title}
                    </span>
                    <span className="text-[12px] text-white/45 tabular-nums">
                      {data.totalXp.toLocaleString()} XP total
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-white/45 tabular-nums">
                    {data.into} / {data.per} XP to level {data.level + 1}
                  </div>
                </div>
                <div className="flex items-center gap-5 pr-1">
                  <Stat value={data.badges.length} label="Badges" />
                  <Stat value={data.claimable} label="To claim" accent />
                </div>
              </div>
            </div>

            {/* Reward hint */}
            <div className="mt-4 flex items-center gap-2 text-[12px] text-white/45">
              <i className="fa-solid fa-gift text-teal-300/80 text-[11px]" />
              Leveling up unlocks new avatar colours — set yours in{" "}
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
              return (
                <section key={cat} className="mt-8">
                  <h2 className="text-[12px] font-medium text-white/40 mb-3">
                    {CATEGORY_LABEL[cat] ?? cat}
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        c={c}
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

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-[22px] font-bold tabular-nums leading-none ${
          accent && value > 0 ? "text-teal-300" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-[10.5px] tracking-wide text-white/45 mt-1">
        {label}
      </div>
    </div>
  );
}

function ChallengeCard({
  c,
  claiming,
  onClaim,
}: {
  c: ChallengeProgress;
  claiming: boolean;
  onClaim: () => void;
}) {
  const shown = Math.min(c.progress, c.target);
  const pct = c.target > 0 ? Math.min(100, (c.progress / c.target) * 100) : 0;

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition ${
        c.claimed
          ? "border-teal-500/25 bg-teal-500/[0.05]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${
            c.claimed
              ? "border-teal-500/30 bg-teal-500/15 text-teal-300"
              : c.complete
                ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                : "border-white/10 bg-white/[0.03] text-white/50"
          }`}
        >
          <i className={`${c.icon} text-[14px]`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight">
            {c.title}
          </div>
          <div className="text-[12px] text-white/50 leading-snug mt-0.5">
            {c.description}
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-teal-300 tabular-nums">
          +{c.xp}
        </span>
      </div>

      <div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              c.complete ? "bg-teal-400" : "bg-white/25"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] text-white/45 tabular-nums">
            {shown} / {c.target}
          </span>
          {c.claimed ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-teal-300 font-medium">
              <i className="fa-solid fa-circle-check text-[10px]" /> Claimed
            </span>
          ) : c.complete ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition text-[12px] font-semibold cursor-pointer disabled:opacity-50"
            >
              {claiming ? (
                <i className="fa-solid fa-circle-notch animate-spin text-[10px]" />
              ) : (
                <i className="fa-solid fa-gift text-[10px]" />
              )}
              Claim
            </button>
          ) : (
            <span className="text-[11px] text-white/30">In progress</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
