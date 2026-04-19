"use client";

import React from "react";
import TradeList from "./TradeList";
import StrategiesList from "./StrategiesList";
import { useRouter } from "next/navigation";

export default function TradeStrategies({ userId }: { userId: string }) {
  const router = useRouter();

  return (
    <div className="w-[100%] max-w-350">
      <div className="flex flex-col md:flex-row justify-between items-center w-[100%] max-w-350">
        <TradeList userId={userId} />
        <StrategiesList userId={userId} />
      </div>
      <div className="text-center text-sm text-white/60 mt-4">
        Click{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => router.push("/settings")}
        >
          here
        </span>{" "}
        to import all trades.
      </div>
    </div>
  );
}
