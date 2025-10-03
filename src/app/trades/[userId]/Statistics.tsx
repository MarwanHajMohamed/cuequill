"use client";

import Bar from "@/app/dashboard/components/charts/Bar";
import Pie from "@/app/dashboard/components/charts/Pie";
import { Trade } from "@/app/types/Trades";
import React from "react";

export default function Statistics({
  data,
  filteredData,
  option,
  symbol,
  strategy,
  status,
}: {
  data: Trade[];
  filteredData: Trade[];
  option: string;
  symbol: string;
  strategy: string;
  status: string;
}) {
  const biggestWin = data.reduce((max: Trade, trade: Trade) => {
    return trade.profitLoss! > max.profitLoss! ? trade : max;
  });

  const biggestLoss = data.reduce((max: Trade, trade: Trade) => {
    return max.profitLoss! > trade.profitLoss! ? trade : max;
  });

  const total = filteredData.length;
  const wins = filteredData.filter((trade) => trade.status === "WIN").length;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const netProfit = filteredData.reduce(
    (acc: number, trade: Trade) => acc + trade.profitLoss!,
    0
  );

  return (
    <div className="mt-10 flex flex-col items-center">
      <div className="mb-5 text-xl font-bold">Statistics</div>
      <div className="mb-10">
        You have made {filteredData.length}{" "}
        {option === "All" ? "total" : option} trade
        {filteredData.length > 1 && "s"}
        {symbol === "All" ? strategy === "All" && "" : ` with ${symbol}`}
        {strategy === "All" ? "" : ` with ${strategy} strategy`}.
      </div>
      <div className="flex items-center justify-between gap-5 w-full max-w-[1500px]">
        <div className="border p-5 rounded-lg bg-[#16151C] border-white/20 w-95">
          <div>Total trades: {filteredData.length}</div>
          <div>Strategy: {strategy}</div>
          <div>Status: {status}</div>
          <div>Option: {option}</div>
        </div>
        <div className="flex items-center gap-5">
          <Pie data={filteredData} />
          <Bar data={filteredData} />
        </div>
        <div className="border p-5 rounded-lg bg-[#16151C] border-white/20 w-95">
          <div>
            Biggest win:{" "}
            <span className="text-green-500">${biggestWin.profitLoss}</span>
          </div>
          <div>
            Biggest loss:{" "}
            <span className="text-red-500">${biggestLoss.profitLoss}</span>
          </div>
          <div>Win rate: {winRate.toFixed(2)}%</div>
          <div>
            Net profit:{" "}
            <span
              className={`${
                netProfit >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              ${netProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
