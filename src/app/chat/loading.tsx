import React from "react";
import { Skeleton } from "@/components/Loaders";

export default function Loading() {
  return (
    <div className="w-full flex flex-col items-stretch pb-3 min-h-[calc(100dvh-88px-env(safe-area-inset-bottom))] md:min-h-screen">
      <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 mt-24 md:mt-28 flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 w-full max-w-xl">
            <Skeleton className="h-7 w-72" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px]" delay={i * 0.04} />
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="mt-3 h-12 rounded-2xl" delay={0.2} />
      </div>
    </div>
  );
}
