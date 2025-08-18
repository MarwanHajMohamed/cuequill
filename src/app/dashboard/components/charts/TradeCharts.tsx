"use client";

import React from "react";
import Pie from "./Pie";
import Bar from "./Bar";
import { useTrades } from "@/hooks/useTrades";

export default function TradeCharts({ userId }: { userId: string }) {
  const { data: trades, isLoading, isError } = useTrades(userId);

  if (isLoading) return <div>Loading trades...</div>;
  if (isError) return <div>Error loading trades</div>;
  if (!trades || trades.length === 0)
    return <div>You have made 0 trades so far.</div>;

  return (
    <div className="flex justify-between w-[100%] max-w-250 items-center my-50">
      <div className="w-[100%]">
        <Pie data={trades} />
      </div>
      <div className="w-[100%]">
        You have made {trades.length} trades so far.
      </div>
      <div className="w-[100%]">
        <Bar data={trades} />
      </div>
    </div>
  );
}
