"use client";

import Bar from "@/app/dashboard/components/charts/Bar";
import Pie from "@/app/dashboard/components/charts/Pie";
import { Trade } from "@/app/types/Trades";
import React, { useState } from "react";

export default function Statistics({
  data,
  filteredData,
  option,
  strategy,
  status,
}: {
  data: Trade[];
  filteredData: Trade[];
  option: string;
  strategy: string;
  status: string;
}) {
  // DATA STATS
  const biggestWin = data.reduce((max: Trade, trade: Trade) => {
    return trade.profitLoss! > max.profitLoss! ? trade : max;
  });

  const biggestLoss = data.reduce((max: Trade, trade: Trade) => {
    return max.profitLoss! > trade.profitLoss! ? trade : max;
  });

  const total = data.length;
  const wins = data.filter((trade) => trade.status === "WIN").length;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const netProfit = data.reduce(
    (acc: number, trade: Trade) => acc + trade.profitLoss!,
    0
  );

  // FILTERED DATA STATS
  const calcBiggestFilteredWin = () => {
    if (status === "Loss") return <span>-</span>;

    const biggestFilteredWin = filteredData
      .filter((trade) => trade.profitLoss! > 0)
      .reduce((max, trade) => Math.max(max, trade.profitLoss!), 0);

    if (biggestFilteredWin === null) {
      return null;
    } else {
      return (
        <span className="text-green-500">${biggestFilteredWin.toFixed(2)}</span>
      );
    }
  };

  const calcBiggestFilteredLoss = () => {
    if (status === "Win") return <span>-</span>;

    const biggestFilteredLoss = filteredData
      .filter((trade) => trade.profitLoss! < 0)
      .reduce((min, trade) => Math.min(min, trade.profitLoss!), 0);

    if (biggestFilteredLoss === null) {
      return null;
    } else {
      return (
        <span className="text-red-500">${biggestFilteredLoss.toFixed(2)}</span>
      );
    }
  };

  const calcFilteredWinRate = () => {
    if (status === "Loss") return <span>-</span>;

    const filteredTotal = filteredData.length;
    const filteredWins = filteredData.filter(
      (trade) => trade.status === "WIN"
    ).length;

    const filteredWinRate =
      total > 0 ? (filteredWins / filteredTotal) * 100 : 0;

    return (
      <span className="text-green-500">{filteredWinRate.toFixed(2)}%</span>
    );
  };

  const calcFilteredNetProfit = () => {
    const filteredNetProfit = filteredData.reduce(
      (acc: number, trade: Trade) => acc + trade.profitLoss!,
      0
    );

    if (filteredNetProfit >= 0) {
      return (
        <span className="text-green-500">${filteredNetProfit.toFixed(2)}</span>
      );
    } else {
      return (
        <span className="text-red-500">${filteredNetProfit.toFixed(2)}</span>
      );
    }
  };

  const strategyCounts: Record<string, number> = {};
  const optionCounts: Record<string, number> = {};
  const symbolCounts: Record<string, number> = {};

  data.forEach((trade) => {
    strategyCounts[trade.strategy] = (strategyCounts[trade.strategy] || 0) + 1;
    optionCounts[trade.option] = (optionCounts[trade.option] || 0) + 1;
    symbolCounts[trade.symbol] = (symbolCounts[trade.symbol] || 0) + 1;
  });

  const mostUsedStrat = Object.entries(strategyCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];

  const mostUsedOption = Object.entries(optionCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];

  const mostUsedSymbol = Object.entries(symbolCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];

  // MONTHLY DATA STATS
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const [date, setDate] = useState({
    monthIndex: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const handlePrevMonth = () => {
    setDate((prev) => {
      const newMonth = prev.monthIndex === 0 ? 11 : prev.monthIndex - 1;
      const newYear = prev.monthIndex === 0 ? prev.year - 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  const handleNextMonth = () => {
    setDate((prev) => {
      const newMonth = prev.monthIndex === 11 ? 0 : prev.monthIndex + 1;
      const newYear = prev.monthIndex === 11 ? prev.year + 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  const currentMonth = months[date.monthIndex];
  const { year } = date;

  const monthlyData = filteredData.filter((trade) => {
    const tradeDate = new Date(trade.dateBought);
    return (
      tradeDate.getMonth() === date.monthIndex &&
      tradeDate.getFullYear() === date.year
    );
  });

  const monthlyWins = monthlyData.filter((t) => t.status === "WIN").length;
  const monthlyWinRate = monthlyData.length
    ? (monthlyWins / monthlyData.length) * 100
    : 0;

  const calcBiggestMonthlyWin = () => {
    if (status === "Loss") return <span>-</span>;

    if (monthlyData.length > 0) {
      const biggestMonthlyWin = monthlyData.reduce((max: Trade, trade: Trade) =>
        trade.profitLoss! > max.profitLoss! ? trade : max
      );
      return (
        <span className="text-green-500">
          ${biggestMonthlyWin.profitLoss?.toFixed(2)}
        </span>
      );
    }
  };

  const calcBiggestMonthlyLoss = () => {
    if (status === "Win") return <span>-</span>;

    if (monthlyData.length > 0) {
      const biggestMonthlyLoss = monthlyData.reduce(
        (max: Trade, trade: Trade) =>
          max.profitLoss! > trade.profitLoss! ? trade : max
      );
      return (
        <span className="text-red-500">
          ${biggestMonthlyLoss.profitLoss?.toFixed(2)}
        </span>
      );
    }
  };

  const netProfitMonthly = monthlyData.reduce(
    (acc: number, trade: Trade) => acc + trade.profitLoss!,
    0
  );

  return (
    <div className="mt-10 flex flex-col items-center w-full max-w-[1500px]">
      {/* Trades Stats */}
      <div className="flex w-full flex-col justify-between xl:flex-row">
        {/* Filtered Stats */}
        <div className="flex flex-col items-center w-full gap-6 md:gap-0">
          <div className="mb-0 md:mb-5 text-sm font-bold">
            Statistics for Filtered Trades
          </div>
          <div className="flex md:gap-6 gap-0 w-full min-[1280px]:pr-6">
            <div className="flex md:flex-col gap-6 w-full max-[500px]:flex-col">
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>Total trades: {filteredData.length}</div>
                <div>Strategy: {strategy}</div>
                <div>Status: {status}</div>
                <div>Option: {option}</div>
              </div>
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>Biggest win: {calcBiggestFilteredWin()}</div>
                <div>Biggest loss: {calcBiggestFilteredLoss()}</div>
                <div>Win rate: {calcFilteredWinRate()}</div>
                <div>Net profit: {calcFilteredNetProfit()}</div>
              </div>
            </div>
            <div>
              <div className="hidden md:flex flex-col items-center border border-[#282828] rounded-lg py-5 pb-1">
                <Pie
                  data={filteredData}
                  innerRadius={40}
                  outerRadius={60}
                  width={130}
                  height={130}
                  fontSize={12}
                />
                <Bar
                  data={filteredData}
                  width={230}
                  height={160}
                  translate={-20}
                />
              </div>
            </div>
          </div>
          <div className="flex md:hidden md:flex-col items-center justify-center border border-[#282828] rounded-lg py-5 w-full  min-[400px]:gap-0">
            <Pie
              data={filteredData}
              innerRadius={35}
              outerRadius={50}
              width={100}
              height={100}
              fontSize={10}
            />
            <div className="w-40">
              <Bar data={filteredData} width={200} height={150} translate={0} />
            </div>
          </div>
        </div>
        <div className="h-auto w-1 bg-[#3A3A3A]"></div>
        {/* Total Stats */}
        <div className="flex flex-col items-center w-full gap-6 md:gap-0 mt-10 xl:mt-0 min-[1280px]:ml-6">
          <div className="mb-0 md:mb-5 text-sm font-bold">Total Statistics</div>
          <div className="flex md:gap-6 gap-0 w-full min-[1280px]:pr-6">
            <div className="flex md:flex-col gap-6 w-full max-[500px]:flex-col">
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>Total trades: {data.length}</div>
                <div className="truncate" title={mostUsedStrat}>
                  Top strat: {mostUsedStrat}
                </div>
                <div>
                  Top option:{" "}
                  <span
                    className={
                      mostUsedOption === "CALL"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {mostUsedOption}
                  </span>
                </div>
                <div>Top symbol: {mostUsedSymbol}</div>
              </div>
              <div className="border md:p-6 border-[#282828] w-full rounded-lg md:text-base text-xs flex flex-col gap-1 md:gap-0 p-3 py-6">
                <div>
                  Biggest win:{" "}
                  <span className="text-green-500">
                    ${biggestWin.profitLoss?.toFixed(2)}
                  </span>
                </div>
                <div>
                  Biggest loss:{" "}
                  <span className="text-red-500">
                    ${biggestLoss.profitLoss?.toFixed(2)}
                  </span>
                </div>
                <div>
                  Win rate:{" "}
                  <span className="text-green-500">{winRate.toFixed(2)}%</span>
                </div>
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
            <div>
              <div className="hidden md:flex flex-col items-center border border-[#282828] rounded-lg py-5 pb-1">
                <Pie
                  data={data}
                  innerRadius={40}
                  outerRadius={60}
                  width={130}
                  height={130}
                  fontSize={12}
                />
                <Bar data={data} width={230} height={160} translate={-20} />
              </div>
            </div>
          </div>
          <div className="flex md:hidden md:flex-col items-center justify-center border border-[#282828] rounded-lg py-5 w-full min-[400px]:gap-0">
            <Pie
              data={data}
              innerRadius={35}
              outerRadius={50}
              width={100}
              height={100}
              fontSize={10}
            />
            <div className="w-40">
              <Bar data={data} width={200} height={150} translate={0} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Section */}
      <div className="flex flex-col items-center mt-10 md:mt-20 w-full max-w-[1000px]">
        <div className="md:text-xl text-sm font-bold">Statistics per Month</div>

        <div className="flex flex-col border border-[#282828] rounded-md w-full mt-5">
          <div className="flex justify-between p-2 border-b border-[#343434] items-center">
            <div
              onClick={handlePrevMonth}
              className="cursor-pointer hover:text-gray-400"
            >
              &lt;
            </div>
            <div className="text-xs md:text-base">
              {currentMonth} {year}
            </div>
            <div
              onClick={handleNextMonth}
              className="cursor-pointer hover:text-gray-400"
            >
              &gt;
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-5">
            {monthlyData.length > 0 ? (
              <div className="flex flex-col min-[500px]:flex-row justify-between w-full">
                <div className="flex flex-col gap-2 p-5 text-xs md:text-base">
                  <div>Total trades: {monthlyData.length}</div>
                  <div>Biggest win: {calcBiggestMonthlyWin()}</div>
                  <div>Biggest loss: {calcBiggestMonthlyLoss()}</div>
                  <div>
                    Win rate:{" "}
                    {monthlyWinRate === 0 ? (
                      <span>-</span>
                    ) : (
                      <span className="text-green-500">
                        {monthlyWinRate.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div>
                    Profit:{" "}
                    <span
                      className={`${
                        netProfitMonthly >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      ${netProfitMonthly.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex md:hidden items-center min-[500px]:justify-end justify-center min-[500px]:w-1/2 max-w-140">
                  <Pie
                    data={monthlyData}
                    innerRadius={35}
                    outerRadius={50}
                    height={100}
                    width={100}
                    fontSize={13}
                  />
                  <Bar
                    data={monthlyData}
                    height={150}
                    width={170}
                    translate={0}
                  />
                </div>
                <div className="hidden md:flex items-center justify-end w-1/2 max-w-140">
                  <Pie
                    data={monthlyData}
                    innerRadius={50}
                    outerRadius={70}
                    height={150}
                    width={150}
                    fontSize={13}
                  />
                  <Bar
                    data={monthlyData}
                    height={180}
                    width={200}
                    translate={-10}
                  />
                </div>
              </div>
            ) : (
              <div className="p-10">
                No trades found for {currentMonth} {year}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
