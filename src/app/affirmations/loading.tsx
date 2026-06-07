import React from "react";
import { Skeleton } from "@/components/Loaders";

export default function Loading() {
  return (
    <div className="w-full flex flex-col items-center min-h-screen">
      <div className="w-full max-w-[1100px] mt-30 px-5 md:px-10">
        <div className="flex flex-col gap-3 items-center text-center">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 md:h-14 w-72" delay={0.04} />
          <Skeleton className="h-4 w-80" delay={0.08} />
        </div>
        <Skeleton className="mt-8 h-[90px]" delay={0.14} />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" delay={0.18 + i * 0.04} />
          ))}
        </div>
      </div>
    </div>
  );
}
