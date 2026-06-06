"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { strategies } from "../../../data/strategies";
import { withAuth } from "@/lib/withAuth";

type Direction = "CALL" | "PUT";

const directionStyle = {
  CALL: {
    eyebrow: "Bullish",
    color: "text-green-400",
    accent: "from-green-500/30 to-emerald-500/0",
    chip: "bg-green-500/10 text-green-300 border-green-500/25",
    icon: "fa-arrow-trend-up",
  },
  PUT: {
    eyebrow: "Bearish",
    color: "text-red-400",
    accent: "from-red-500/30 to-orange-500/0",
    chip: "bg-red-500/10 text-red-300 border-red-500/25",
    icon: "fa-arrow-trend-down",
  },
} as const;

const StrategyCard = ({
  title,
  slug,
  timeframe,
  direction,
  index,
}: {
  title: string;
  slug: string;
  timeframe?: string;
  direction: Direction;
  index: number;
}) => {
  const style = directionStyle[direction];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
    >
      <Link
        href={`/strategies/${slug}`}
        prefetch
        className="group relative block rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition overflow-hidden"
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div
            className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${style.chip}`}
          >
            <i className={`fa-solid ${style.icon} text-[13px]`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] md:text-[15px] font-medium tracking-tight truncate">
              {title}
            </div>
            {timeframe && (
              <div className="text-[11px] text-white/45 mt-0.5">
                {timeframe}
              </div>
            )}
          </div>
          <i className="fa-solid fa-arrow-right text-[12px] text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition" />
        </div>
      </Link>
    </motion.div>
  );
};

const Column = ({
  direction,
  items,
}: {
  direction: Direction;
  items: { title: string; slug: string; timeframe?: string }[];
}) => {
  const style = directionStyle[direction];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <div className="flex items-baseline gap-2">
          <h2 className={`text-xl md:text-2xl font-semibold ${style.color}`}>
            {direction}
          </h2>
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">
            {style.eyebrow}
          </span>
        </div>
        <span className="text-[12px] text-white/40 tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((s, i) => (
          <StrategyCard
            key={s.slug}
            title={s.title}
            slug={s.slug}
            timeframe={s.timeframe}
            direction={direction}
            index={i}
          />
        ))}
      </div>
    </div>
  );
};

function Page() {
  const tf = (t: (typeof strategies)[number]["timeframe"]) =>
    Array.isArray(t) ? t.join(" · ") : t;
  const calls = strategies
    .filter((s) => s.options === "CALL")
    .map((s) => ({ title: s.title, slug: s.slug, timeframe: tf(s.timeframe) }));
  const puts = strategies
    .filter((s) => s.options === "PUT")
    .map((s) => ({ title: s.title, slug: s.slug, timeframe: tf(s.timeframe) }));

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40% 50% at 25% 0%, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0) 75%), radial-gradient(40% 50% at 75% 0%, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0) 75%)",
        }}
      />

      {/* HERO */}
      <div className="w-full max-w-[1100px] mt-30 px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-3 text-center items-center"
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/40 font-medium">
            Setups
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-green-400 via-teal-300 to-red-400 bg-clip-text text-transparent">
              Strategies
            </span>
          </h1>
          <p className="text-sm md:text-[15px] text-white/55 max-w-xl leading-relaxed">
            {strategies.length} setups, organised by direction. Tap one to see
            the schematic and rules.
          </p>
        </motion.div>

        {/* Columns */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Column direction="CALL" items={calls} />
          <Column direction="PUT" items={puts} />
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
