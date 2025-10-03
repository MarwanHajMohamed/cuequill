import Bar from "@/app/dashboard/components/charts/Bar";
import Pie from "@/app/dashboard/components/charts/Pie";
import { Trade } from "@/app/types/Trades";
import React from "react";

export default function Statistics({
  data,
  option,
  symbol,
  strategy,
}: {
  data: Trade[];
  option: string;
  symbol: string;
  strategy: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center">
      <div className="mb-5 text-xl font-bold">Statistics</div>
      <div className="mb-10">
        You have made {data.length} {option === "All" ? "total" : option} trade
        {data.length > 1 && "s"}
        {symbol === "All" ? strategy === "All" && "" : ` with ${symbol}`}
        {strategy === "All" ? "" : ` with ${strategy} strategy`}.
      </div>
      <div className="flex items-center gap-5">
        <Pie data={data} />
        <Bar data={data} />
      </div>
    </div>
  );
}
