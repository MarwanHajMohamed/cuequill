"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import { useChallenges, type Trophy } from "@/hooks/useChallenges";
import { useToast } from "@/hooks/useToast";
import { useTheme } from "@/hooks/useTheme";
import { Skeleton } from "@/components/Loaders";

function Page() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useChallenges();
  const [equipping, setEquipping] = React.useState(false);

  const equipTitle = async (title: string) => {
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

  const earned = data?.trophies.filter((t) => t.earned).length ?? 0;
  const total = data?.trophies.length ?? 0;
  const pct = total > 0 ? (earned / total) * 100 : 0;

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(55% 50% at 50% 0%, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0) 72%), radial-gradient(45% 45% at 82% 4%, rgba(234,179,8,0.12) 0%, rgba(234,179,8,0) 72%)",
          }}
        />

        <header className="pb-6 border-b border-white/10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight flex items-center gap-2.5">
              <i className="fa-solid fa-award text-teal-300" />
              Trophies
            </h1>
            <p className="text-[13.5px] text-white/50 mt-1.5 leading-relaxed max-w-lg">
              Milestone awards you earn automatically as your journal grows.
              Some also unlock a title you can wear as a nameplate.
            </p>
          </div>
          <Link
            href="/challenges"
            className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/12 bg-white/[0.03] text-[12.5px] font-medium text-white/75 hover:text-white hover:border-white/25 transition"
          >
            <i className="fa-solid fa-medal text-[11px] text-amber-300/80" />
            Challenges
          </Link>
        </header>

        {isLoading || !data ? (
          <TrophiesSkeleton />
        ) : (
          <>
            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-8 flex items-center gap-3"
            >
              <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/25 flex items-center justify-center text-amber-300">
                <i className="fa-solid fa-trophy text-[15px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-[15px] font-semibold tabular-nums leading-none">
                    {earned}
                  </span>
                  <span className="text-[12px] text-white/50">
                    of {total} trophies earned
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden max-w-md">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Trophy grid — each in its own display cabinet. */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.trophies.map((t, i) => (
                <TrophyCard key={t.id} t={t} index={i} />
              ))}
            </div>

            {/* Nameplate — equip an earned title next to your name. */}
            <section className="mt-12">
              <h2 className="text-[13px] font-semibold text-white/80 mb-1.5 flex items-center gap-2">
                <i className="fa-solid fa-id-badge text-amber-300/80 text-[12px]" />
                Nameplate
              </h2>
              <p className="text-[12px] text-white/50 mb-3 leading-relaxed max-w-lg">
                Pick a title to show beside your name.
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
                          ? "border-amber-400/50 bg-amber-500/15 text-amber-200 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)]"
                          : "border-white/12 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white/90"
                      }`}
                    >
                      <i
                        className={`fa-solid ${active ? "fa-circle-check" : "fa-tag"} text-[10px] ${
                          active ? "text-amber-300" : "text-white/40"
                        }`}
                      />
                      {t}
                    </button>
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

// Loading placeholder mirroring the page: summary row, trophy grid, nameplate.
function TrophiesSkeleton() {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Skeleton className="h-3.5 w-40" delay={0.04} />
          <Skeleton className="h-1 w-full max-w-md rounded-full" delay={0.08} />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-[150px] rounded-2xl"
            delay={0.12 + i * 0.03}
          />
        ))}
      </div>
      <div className="mt-12 flex flex-col gap-3">
        <Skeleton className="h-3.5 w-28" delay={0.3} />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-7 w-24 rounded-full"
              delay={0.34 + i * 0.03}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrophyCard({ t, index }: { t: Trophy; index: number }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.32, delay: index * 0.03, ease: "easeOut" }}
      className="flex flex-col items-center text-center px-4 pt-6 pb-5"
    >
      {/* Medallion on its shelf */}
      <div className="relative flex flex-col items-center">
        <div
          className={`relative w-[68px] h-[68px] rounded-full flex items-center justify-center ${
            t.earned ? "" : "opacity-70"
          }`}
          style={
            t.earned
              ? {
                  background:
                    "conic-gradient(from 140deg, #fcd34d, #f59e0b, #b45309, #fcd34d)",
                  boxShadow: "0 0 26px -6px rgba(245,158,11,0.75)",
                }
              : { background: "rgba(255,255,255,0.05)" }
          }
        >
          <div
            className={`w-[56px] h-[56px] rounded-full flex items-center justify-center border ${
              t.earned
                ? isLight
                  ? "bg-amber-100 border-amber-400/40 text-amber-700"
                  : "bg-[#1a1206] border-amber-300/30 text-amber-200"
                : "bg-white/[0.02] border-white/10 text-white/35"
            }`}
          >
            <i
              className={`${t.earned ? t.icon : "fa-solid fa-lock"} text-[22px]`}
            />
          </div>
        </div>
        {/* Shelf line + soft reflection under the medallion. */}
        <span
          aria-hidden
          className={`mt-2.5 block h-px w-16 ${
            t.earned
              ? "bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/12 to-transparent"
          }`}
        />
      </div>

      {/* Title */}
      <div
        className={`mt-3 flex items-center gap-1.5 text-[14px] font-semibold leading-tight ${
          t.earned ? "" : "text-white/60"
        }`}
      >
        {t.label}
        {t.earned && (
          <i className="fa-solid fa-circle-check text-[11px] text-amber-300/90" />
        )}
      </div>

      {/* Description */}
      <div className="mt-1 text-[11.5px] text-white/45 leading-snug">
        {t.description}
      </div>

      {/* Tag */}
      {t.title && (
        <span
          className={`mt-3 inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
            t.earned
              ? "text-amber-200/90 border-amber-400/30 bg-amber-500/10"
              : "text-white/35 border-white/10 bg-white/[0.03]"
          }`}
        >
          <i className="fa-solid fa-tag text-[8px]" />
          {t.title}
        </span>
      )}
    </motion.div>
  );
}

export default withAuth(Page);
