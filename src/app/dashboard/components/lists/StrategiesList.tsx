"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { useRouter } from "next/navigation";
import React from "react";

export default function StrategiesList({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  const router = useRouter();

  if (isLoading)
    return (
      <div className="text-[#5B5B5B] p-6 space-y-4 w-[100%] max-w-150">
        <h2 className="font-semibold text-white">Most used strategies:</h2>
        <ul className="bg-[#16151C] border border-white/10 rounded-lg p-4 min-h-44">
          <li>Loading strategies...</li>
        </ul>
      </div>
    );

  if (isError)
    return (
      <div className="text-red-500 p-6 space-y-4 w-[100%] max-w-150">
        <h2 className="font-semibold text-white">Most used strategies:</h2>
        <ul className="bg-[#16151C] border border-white/10 rounded-lg p-4 min-h-44">
          <li>Error loading strategies</li>
        </ul>
      </div>
    );

  if (!trades || trades.length === 0)
    return (
      <div className="text-[#5B5B5B] p-6 space-y-4 w-[100%] max-w-150">
        <h2 className="font-semibold text-white">Most used strategies:</h2>
        <ul className="bg-[#16151C] border border-white/10 rounded-lg p-4 min-h-44 text-sm md:text-base">
          <li>No strategies found</li>
        </ul>
        <div className="flex justify-end text-white">
          <button
            className="bg-blue-600 py-2 px-4 rounded-md cursor-pointer ease-in-out transition duration-100 hover:bg-blue-700 text-xs md:text-base"
            onClick={() => router.push(`/strategies_used/${userId}`)}
          >
            See all
          </button>
        </div>
      </div>
    );

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
      <h2 className="font-semibold md:text-base text-sm">
        Most used strategies:
      </h2>
      <ul className="bg-[#16151C] border border-white/10 rounded-lg pl-4 min-h-44 text-sm">
        {sortedStrategies.slice(0, 4).map(([strategy, count]) => {
          return (
            <li
              key={strategy}
              className="p-3 pl-0 border-b border-white/10 last:border-0"
            >
              <div className="flex justify-between items-center md:text-sm text-xs">
                <div>{strategy}</div>
                <div>{count}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <button
          className="bg-blue-600 py-2 px-4 rounded-md cursor-pointer ease-in-out transition duration-100 hover:bg-blue-700 text-xs md:text-base"
          onClick={() => router.push(`/strategies_used/${userId}`)}
        >
          See all
        </button>
      </div>
    </div>
  );
}
