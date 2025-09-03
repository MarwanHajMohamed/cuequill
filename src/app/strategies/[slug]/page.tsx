"use client";

import React, { use } from "react";
import { strategies } from "../../../../data/strategies";
import StrategyContent from "../StrategyContent/StrategyContent";
import { withAuth } from "@/lib/withAuth";

function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const strategy = strategies.find((s) => s.slug === slug);

  if (!strategy) {
    return <div>Strategy not found</div>;
  }

  return (
    <div className="mt-30 mx-10 flex flex-col items-center">
      <div className="w-full max-w-[1500px]">
        <div>
          <h1 className="text-xl text-center">
            {strategy.title} -{" "}
            <span
              className={
                strategy.options === "CALL" ? "text-green-500" : "text-red-500"
              }
            >
              {strategy.options}
            </span>
          </h1>
          <h2 className="text-center">
            {Array.isArray(strategy.timeframe)
              ? strategy.timeframe.join(" / ")
              : strategy.timeframe}
          </h2>
        </div>
        <StrategyContent blocks={strategy.blocks} />
      </div>
    </div>
  );
}

export default withAuth(Page);
