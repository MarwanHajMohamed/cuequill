"use client";

import { withAuth } from "@/lib/withAuth";
import { motion } from "framer-motion";
import React from "react";

type Rule = { title: string; body?: string; sub?: string[] };

const timeframes: Rule[] = [
  {
    title: "Market hours",
    body: "Opens 9:30 AM ET, closes 4:00 PM ET. Weekends are closed.",
  },
  {
    title: "Skip the first 30 minutes",
    body: "Never trade between 9:30 and 10:00 — opening candles are too volatile.",
  },
  {
    title: "Premarket signals sells, not buys",
    body: "Use premarket to flag exits, not entries.",
  },
  {
    title: "PUTs at the open",
    body: "Sell PUTs at 9:30 — price typically opens low and rallies.",
  },
  {
    title: "Last call",
    body: "Last entry is 3:59 PM. Anything after fills at the next 9:30 open.",
  },
  {
    title: "SPY / QQQ extended close",
    body: "These trade until 4:14 PM. Closing bell at 4:15 PM.",
  },
];

const rules: Rule[] = [
  { title: "Start small", body: "Don't size into a setup you haven't proven." },
  {
    title: "10% per trade",
    body: "Cap each entry at 10% of portfolio.",
    sub: ["Example: $500 portfolio → $50 per trade."],
  },
  { title: "2–4 trades per week", body: "More than that is noise, not edge." },
  {
    title: "Respect the timeframes",
    body: "If the rule window says no, the answer is no.",
  },
  {
    title: "Only buy fulfilled candles",
    body: "Wait for the candle to close. Never act on a live wick.",
  },
  { title: "Do not exit on a loss", body: "Let the plan run, not your emotions." },
  {
    title: "No Fed days",
    body: "Sit out FOMC and meeting dates — direction is unpredictable.",
  },
];

const Section = ({
  eyebrow,
  title,
  ordered,
  items,
}: {
  eyebrow: string;
  title: string;
  ordered: boolean;
  items: Rule[];
}) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 md:p-7"
  >
    <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium mb-2">
      {eyebrow}
    </div>
    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5">
      {title}
    </h2>
    <ol className="flex flex-col gap-3 md:gap-4">
      {items.map((r, i) => (
        <li key={r.title} className="flex gap-4">
          <div
            className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-[12px] font-semibold tabular-nums ${
              ordered
                ? "bg-teal-500/10 border-teal-500/25 text-teal-300"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
          >
            {ordered ? String(i + 1).padStart(2, "0") : (
              <i className="fa-solid fa-clock text-[11px]" />
            )}
          </div>
          <div className="flex-1 pt-0.5">
            <div className="text-[14px] md:text-[15px] font-medium text-white">
              {r.title}
            </div>
            {r.body && (
              <div className="text-[13px] md:text-[14px] text-white/55 leading-relaxed mt-0.5">
                {r.body}
              </div>
            )}
            {r.sub && (
              <ul className="mt-2 flex flex-col gap-1">
                {r.sub.map((s) => (
                  <li
                    key={s}
                    className="text-[12.5px] text-white/45 pl-3 border-l border-white/10"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  </motion.section>
);

function Page() {
  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
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
            Playbook
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Rules & timeframes
            </span>
          </h1>
          <p className="text-sm md:text-[15px] text-white/55 max-w-xl leading-relaxed">
            The non-negotiables. Read them before you open a position.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Section
            eyebrow="When"
            title="Trading windows"
            ordered={false}
            items={timeframes}
          />
          <Section
            eyebrow="How"
            title="Position rules"
            ordered
            items={rules}
          />
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
