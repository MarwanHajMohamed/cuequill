import React from "react";
import { Skeleton } from "@/components/Loaders";

export default function Loading() {
  return (
    <div className="w-full flex flex-col items-center min-h-screen">
      <div className="w-full max-w-[1100px] mt-30 md:mt-10 px-5 md:px-10">
        <div className="flex flex-col gap-3 items-center text-center">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 md:h-14 w-56" delay={0.04} />
          <Skeleton className="h-4 w-80" delay={0.08} />
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((col) => (
            <div key={col} className="flex flex-col gap-3">
              <Skeleton className="h-6 w-24" delay={0.1 + col * 0.05} />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[64px]"
                  delay={0.15 + col * 0.05 + i * 0.04}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
