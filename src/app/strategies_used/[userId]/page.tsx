"use client";

import { useTrades } from "@/hooks/useTrades";
import React from "react";

export default function Page({ params }: { params: { userId: string } }) {
  const { userId } = params;

  const { data: trades, isLoading, isError } = useTrades(userId);

  if (isLoading) return <div className="text-white">Loading strategies...</div>;
  if (isError)
    return <div className="text-red-500">Error loading strategies</div>;

  if (!trades || trades.length === 0)
    return <div className="text-gray-400">No strategies found.</div>;

  const strategyCounts: Record<string, number> = trades.reduce((acc, trade) => {
    acc[trade.strategy] = (acc[trade.strategy] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const strategies = [
    "Moving Average 40",
    "Normal Fall & Hard Fall",
    "Bearish Channel Break",
    "Normal Bullish Gap",
    "Bearish Gap Uptrend",
    "Hard Floor",
    "The First Uptrend Gap",
    "First Red Opening Candle",
    "Gap Floor Break",
    "Model of 4 Steps",
    "Hanger in Daily",
  ];

  const strategyList = strategies.map((s) => ({
    name: s,
    count: strategyCounts[s] || 0,
  }));

  strategyList.sort((a, b) => b.count - a.count);

  return (
    <div className="p-10 text-white flex flex-col items-center mt-20">
      <div className="text-xl mb-4 text-center">Most Used Strategies</div>
      <div className="space-y-4 w-200">
        {strategyList.map((s) => (
          <div
            key={s.name}
            className="flex justify-between border-b border-white/10 pb-1"
          >
            <span>{s.name}</span>
            <span className={s.count === 0 ? "text-[#5B5B5B]" : "text-white"}>
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
