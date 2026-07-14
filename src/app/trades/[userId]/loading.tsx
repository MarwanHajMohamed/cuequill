import React from "react";
import { HeroSkeleton, TableSkeleton } from "@/components/Loaders";

export default function Loading() {
  return (
    <div className="w-full flex justify-center md:justify-start mt-19 md:mt-8">
      <div className="w-full max-w-[1500px] px-5 md:px-10 pb-10">
        <HeroSkeleton />
        <TableSkeleton rows={10} columns={7} />
      </div>
    </div>
  );
}
