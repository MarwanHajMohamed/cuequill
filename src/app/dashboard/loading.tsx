import React from "react";
import { Skeleton } from "@/components/Loaders";

// Suspense fallback for /dashboard. Renders the instant the user taps
// the Home tab, before the dashboard bundle finishes loading.
export default function Loading() {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-[1500px] mt-30 px-5 md:px-10">
        {/* Hero shell */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-8 md:gap-12">
          <div className="flex flex-col gap-3 md:max-w-[60%]">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 md:h-14 w-56 md:w-72" delay={0.04} />
            <Skeleton className="h-4 w-72 md:w-96" delay={0.08} />
          </div>
          <Skeleton className="w-full md:w-[340px] h-[160px]" delay={0.12} />
        </div>
        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Skeleton className="h-[260px]" delay={0.18} />
          <Skeleton className="h-[260px]" delay={0.22} />
          <Skeleton className="h-[180px]" delay={0.26} />
          <Skeleton className="h-[180px]" delay={0.3} />
        </div>
      </div>
    </div>
  );
}
