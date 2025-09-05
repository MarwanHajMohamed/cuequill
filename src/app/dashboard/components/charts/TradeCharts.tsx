"use client";

import React from "react";
import Pie from "./Pie";
import Bar from "./Bar";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function TradeCharts({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  if (isLoading) return <div>Loading trades...</div>;
  if (isError) return <div>Error loading trades</div>;
  if (!trades || trades.length === 0)
    return <div className="my-50 mx-10">You have made 0 trades so far.</div>;

  return (
    <div className="flex justify-between w-[100%] max-w-250 items-center my-50 mx-10">
      <div className="w-[100%]">
        <Pie data={trades} />
      </div>
      <div className="w-[100%]">
        You have made {trades.length} trade{trades.length === 1 ? "" : "s"} so
        far.
      </div>
      <div className="w-[100%]">
        <Bar data={trades} />
      </div>
    </div>
  );
}
