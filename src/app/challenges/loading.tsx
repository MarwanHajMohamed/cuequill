import React from "react";
import { Skeleton } from "@/components/Loaders";

// Suspense fallback for /challenges - mirrors the page shell (header, level
// summary, then category sections of glass cards) so there's no blank flash
// before the bundle/data resolves.
export default function Loading() {
  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        {/* Header */}
        <div className="pb-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3.5 w-72 md:w-96" delay={0.05} />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl shrink-0" delay={0.1} />
        </div>

        {/* Level summary */}
        <div className="mt-8 flex items-center gap-4 flex-wrap">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <div className="flex-1 min-w-[220px] flex flex-col gap-2">
            <Skeleton className="h-4 w-44" delay={0.04} />
            <Skeleton className="h-1.5 w-full max-w-md rounded-full" delay={0.08} />
            <Skeleton className="h-3 w-24" delay={0.12} />
          </div>
        </div>

        {/* Category sections */}
        {[3, 6].map((n, s) => (
          <div key={s} className="mt-8">
            <div className="flex items-center gap-2.5 mb-3">
              <Skeleton className="w-2.5 h-2.5 rounded-full" delay={0.1 + s * 0.06} />
              <Skeleton className="h-3.5 w-28" delay={0.13 + s * 0.06} />
            </div>
            <div className="chal-grid">
              {Array.from({ length: n }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[132px] rounded-2xl"
                  delay={0.16 + s * 0.06 + i * 0.03}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
