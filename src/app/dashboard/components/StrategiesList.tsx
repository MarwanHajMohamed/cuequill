"use client";

import { useTrades } from "@/hooks/useTrades";
import React from "react";

export default function StrategiesList({ userId }: { userId: string }) {
  const { data: trades, isLoading, isError } = useTrades(userId);

  if (isLoading) return <div className="text-white">Loading trades...</div>;
  if (isError) return <div className="text-red-500">Error loading trades</div>;

  if (!trades || trades.length === 0)
    return <div className="text-gray-400">No trades found.</div>;

  const strategyCounts: Record<string, number> = {};
  trades.forEach((trade) => {
    if (trade.strategy) {
      strategyCounts[trade.strategy] =
        (strategyCounts[trade.strategy] || 0) + 1;
    }
  });

  const sortedStrategies = Object.entries(strategyCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="text-white p-6 space-y-4 w-[100%] max-w-150">
      <h2 className="font-semibold">Most used strategies:</h2>
      <ul className="bg-[#16151C] border border-white/10 rounded-lg pl-4 min-h-44 text-sm">
        {sortedStrategies.map(([strategy, count]) => {
          return (
            <li
              key={strategy}
              className="p-3 pl-0 border-b border-white/10 last:border-0"
            >
              <div className="flex justify-between items-center">
                <div>{strategy}</div>
                <div>{count}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <button className="bg-blue-800 py-2 px-4 rounded-md cursor-pointer ease-in-out transition duration-100 hover:bg-blue-700">
          See all
        </button>
      </div>
    </div>
  );
}
