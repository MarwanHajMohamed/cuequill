import React from "react";
import { Skeleton } from "@/components/Loaders";

export default function Loading() {
  return (
    <div className="w-full flex justify-center mt-19 md:mt-27">
      <div className="w-full md:max-w-[1400px] px-3 md:px-10">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-9 w-40 mb-3" />
            <Skeleton className="h-[520px] md:h-[600px] w-full" delay={0.05} />
          </div>
          <div className="hidden md:flex w-44 shrink-0 flex-col gap-1 mt-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px]" delay={i * 0.04} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
