"use client";

import React, { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { strategies } from "../../../../data/strategies";
import StrategyContent from "../StrategyContent/StrategyContent";
import { withAuth } from "@/lib/withAuth";
import { StrategySchematic } from "@/components/strategy-chart/schematics";

function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const strategy = strategies.find((s) => s.slug === slug);

  if (!strategy) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center px-5">
        <div className="text-white/40 text-sm tracking-[0.18em] mb-2">
          not found
        </div>
        <div className="text-xl mb-6">No strategy at this slug.</div>
        <Link
          href="/strategies"
          className="px-4 py-2 rounded-full border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition text-sm"
        >
          <i className="fa-solid fa-chevron-left text-[10px] mr-1.5" />
          back to strategies
        </Link>
      </div>
    );
  }

  // Same-direction prev/next for in-page navigation.
  const sameDirection = strategies.filter(
    (s) => s.options === strategy.options,
  );
  const idx = sameDirection.findIndex((s) => s.slug === strategy.slug);
  const prev = idx > 0 ? sameDirection[idx - 1] : null;
  const next =
    idx >= 0 && idx < sameDirection.length - 1 ? sameDirection[idx + 1] : null;

  // Split blocks: every descriptive block (text + list) up to the first
  // visual block (image / file / chart / video) sits beside the schematic
  // on desktop. Visuals stay full-width below.
  const isVisual = (b: (typeof strategy.blocks)[number]) =>
    b.type === "image" ||
    b.type === "file" ||
    b.type === "chart" ||
    b.type === "video";
  const firstVisualIdx = strategy.blocks.findIndex(isVisual);
  const splitAt =
    firstVisualIdx === -1 ? strategy.blocks.length : firstVisualIdx;
  const entryBlocks = strategy.blocks.slice(0, splitAt);
  const restBlocks = strategy.blocks.slice(splitAt);

  const isCall = strategy.options === "CALL";
  const directionLabel = isCall ? "bullish" : "bearish";
  const directionAccent = isCall ? "from-green-400" : "from-red-400";
  const directionAccentTo = isCall ? "to-emerald-300" : "to-orange-300";
  const directionChip = isCall
    ? "bg-green-500/10 text-green-300 border-green-500/25"
    : "bg-red-500/10 text-red-300 border-red-500/25";
  const directionIcon = isCall ? "fa-arrow-trend-up" : "fa-arrow-trend-down";

  const timeframeText = Array.isArray(strategy.timeframe)
    ? strategy.timeframe.join(" · ")
    : strategy.timeframe;

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-20">
      {/* Aurora - color matches direction. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: isCall
            ? "radial-gradient(50% 50% at 50% 0%, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(20,184,166,0.10) 0%, rgba(20,184,166,0) 75%)"
            : "radial-gradient(50% 50% at 50% 0%, rgba(239,68,68,0.14) 0%, rgba(239,68,68,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1500px] mt-25 md:mt-30 px-5 md:px-10">
        {/* HERO - left-aligned, same hero language as the Trades page. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/strategies"
              prefetch
              aria-label="back to strategies"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition"
            >
              <i className="fa-solid fa-chevron-left text-[10px]" />
            </Link>
            <div className="text-[11px] tracking-[0.18em] text-white/40 font-medium">
              setup
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${directionChip}`}
            >
              <i className={`fa-solid ${directionIcon} text-[9px]`} />
              <span className="tracking-wider">
                {strategy.options} · {directionLabel}
              </span>
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
              <span
                className={`bg-gradient-to-r ${directionAccent} ${directionAccentTo} bg-clip-text text-transparent`}
              >
                {strategy.title}
              </span>
            </h1>
            {timeframeText && (
              <div className="text-[12px] text-white/45 tracking-[0.15em]">
                {timeframeText} timeframe
              </div>
            )}
          </div>
        </motion.div>

        {/* Schematic + entry blocks */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-5"
        >
          {/* Schematic card */}
          <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] tracking-[0.18em] text-white/40 font-medium">
                schematic
              </div>
            </div>
            <div className="min-w-0">
              <StrategySchematic slug={strategy.slug} />
            </div>
          </div>

          {/* Entry block card */}
          {entryBlocks.length > 0 ? (
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-5 md:p-6">
              <div className="text-[11px] tracking-[0.18em] text-teal-400/80 font-medium mb-3">
                setup
              </div>
              <StrategyContent blocks={entryBlocks} />
            </div>
          ) : (
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 text-[13px] text-white/40 flex items-center justify-center text-center">
              See the visual references below.
            </div>
          )}
        </motion.div>

        {/* Full-width content */}
        {restBlocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14, ease: "easeOut" }}
            className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-5 md:p-7"
          >
            <StrategyContent blocks={restBlocks} />
          </motion.div>
        )}

        {/* Prev / next */}
        {(prev || next) && (
          <div className="mt-10 grid grid-cols-2 gap-3">
            {prev ? (
              <Link
                href={`/strategies/${prev.slug}`}
                prefetch
                className="group min-w-0 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition p-4 flex flex-col"
              >
                <div className="text-[11px] tracking-[0.15em] text-white/40 mb-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-chevron-left text-[10px] group-hover:-translate-x-0.5 transition" />
                  previous
                </div>
                <div className="w-full text-[14px] font-medium truncate">
                  {prev.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/strategies/${next.slug}`}
                prefetch
                className="group rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition p-4 flex flex-col items-end text-right"
              >
                <div className="text-[11px] tracking-[0.15em] text-white/40 mb-1 flex items-center gap-1.5">
                  next
                  <i className="fa-solid fa-chevron-right text-[10px] group-hover:translate-x-0.5 transition" />
                </div>
                <div className="w-full text-[14px] font-medium truncate">
                  {next.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(Page);
