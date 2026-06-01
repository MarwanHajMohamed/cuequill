"use client";

import React, { use } from "react";
import Link from "next/link";
import { strategies } from "../../../../data/strategies";
import StrategyContent from "../StrategyContent/StrategyContent";
import { withAuth } from "@/lib/withAuth";
import { StrategySchematic } from "@/components/strategy-chart/schematics";

function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const strategy = strategies.find((s) => s.slug === slug);

  if (!strategy) {
    return <div>Strategy not found</div>;
  }

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

  return (
    <div className="mt-30 md:mx-10 mx-5 flex flex-col items-center">
      <div className="w-full max-w-[1500px]">
        <Link
          href="/strategies"
          aria-label="Back to strategies"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition mb-4 border p-2 fixed rounded-xl bg-white/3 backdrop-blur-xs"
        >
          <i className="fa-solid fa-chevron-left text-xs"></i>
          <span>Strategies</span>
        </Link>
        <div>
          <h1 className="md:text-xl text-center">
            {strategy.title} -{" "}
            <span
              className={
                strategy.options === "CALL" ? "text-green-500" : "text-red-500"
              }
            >
              {strategy.options}
            </span>
          </h1>
          <h2 className="text-center text-sm mb-5">
            {Array.isArray(strategy.timeframe)
              ? strategy.timeframe.join(" / ")
              : strategy.timeframe}
          </h2>
        </div>
        <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start mb-6">
          <div className="md:flex-1 min-w-0 mb-4 md:mb-0">
            <StrategySchematic slug={strategy.slug} />
          </div>
          {entryBlocks.length > 0 && (
            <div className="md:shrink-0">
              <StrategyContent blocks={entryBlocks} />
            </div>
          )}
        </div>
        <StrategyContent blocks={restBlocks} />
      </div>
    </div>
  );
}

export default withAuth(Page);
