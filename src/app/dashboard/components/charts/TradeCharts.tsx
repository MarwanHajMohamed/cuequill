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
    <div className="flex flex-col md:flex-row text-center justify-between w-[100%] max-w-250 items-center mx-10 my-20 md:my-50">
      <div className="w-[100%]">
        <Pie
          data={trades}
          innerRadius={60}
          outerRadius={90}
          height={180}
          width={180}
          fontSize={12}
        />
      </div>
      <div className="w-[100%] mt-15 md:mt-0 text-sm md:text-base">
        You have made {trades.length} trade{trades.length === 1 ? "" : "s"} so
        far.
      </div>
      <div className="w-[100%]">
        <Bar data={trades} height={250} width={250} translate={-20} />
      </div>
    </div>
  );
}
