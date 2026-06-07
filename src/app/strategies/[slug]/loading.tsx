import React from "react";
import { Skeleton } from "@/components/Loaders";

export default function Loading() {
  return (
    <div className="w-full flex flex-col items-center min-h-screen">
      <div className="w-full max-w-[1200px] mt-25 md:mt-30 px-5 md:px-10">
        <div className="flex flex-col items-center text-center gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 md:h-12 w-72" delay={0.04} />
          <Skeleton className="h-3 w-40" delay={0.08} />
        </div>
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-5">
          <Skeleton className="lg:col-span-3 h-[320px]" delay={0.12} />
          <Skeleton className="lg:col-span-2 h-[320px]" delay={0.16} />
        </div>
        <Skeleton className="mt-6 h-[180px]" delay={0.22} />
      </div>
    </div>
  );
}
