import React from "react";
import { Skeleton } from "@/components/Loaders";

// Suspense fallback for /leaderboard - mirrors the page shell (header, tab
// row, podium, ranked list) so there's no blank flash before the bundle /
// data resolves.
export default function Loading() {
  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3.5 w-72 md:w-[28rem]" delay={0.05} />
        </div>

        {/* Tabs */}
        <Skeleton className="mt-6 h-11 w-72 rounded-2xl self-start" delay={0.08} />

        {/* Podium */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 md:gap-4 items-end">
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              className={`rounded-2xl ${i === 1 ? "h-44" : "h-36"}`}
              delay={0.1 + i * 0.04}
            />
          ))}
        </div>

        {/* Ranked list */}
        <div className="mt-3 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/[0.06]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="w-6 h-4 rounded" delay={i * 0.03} />
              <Skeleton className="w-9 h-9 rounded-full" delay={i * 0.03} />
              <div className="flex-1">
                <Skeleton className="w-32 h-3.5 rounded" delay={i * 0.03} />
                <Skeleton className="w-20 h-2.5 rounded mt-1.5" delay={i * 0.03} />
              </div>
              <Skeleton className="w-12 h-4 rounded" delay={i * 0.03} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
