"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { withAuth } from "@/lib/withAuth";
import React, { use } from "react";

function Page({ params }: { params: Promise<{ userId: string }> }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const { userId } = use(params);

  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  if (isLoading) return <div className="text-white">Loading trades...</div>;
  if (isError) return <div className="text-red-500">Error loading trades</div>;

  if (!trades || trades.length === 0)
    return <div className="text-gray-400">No trades found.</div>;

  const headings = [
    "Symbol",
    "PUT/CALL",
    "Status",
    "P/L",
    "Change %",
    "Spot Price",
    "Contract Price",
    "Qty",
    "Strike",
    "Date Bought",
    "Expiry Date",
    "Closing Spot Price",
    "Closing Contract Price",
    "Strategy",
    "Notes",
  ];

  const calcChange = (newPrice: number, oldPrice: number) => {
    return (((newPrice - oldPrice) / oldPrice) * 100).toFixed(0);
  };

  return (
    <div className="overflow-x-auto p-10 mt-20">
      <table className="border-collapse table-auto min-w-full">
        <thead>
          <tr>
            {headings.map((h) => (
              <th
                key={h}
                className="px-4 py-1 whitespace-nowrap w-full text-[#5B5B5B] text-xs text-left"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={index}>
              <td className="px-4 py-1 whitespace-nowrap w-full">
                {trade.symbol}
              </td>
              <td
                className={`px-4 py-1 whitespace-nowrap w-full ${
                  trade.option === "CALL" ? "text-green-500" : "text-red-500"
                }`}
              >
                {trade.option.slice(0, 1) +
                  trade.option.slice(1, trade.option.length).toLowerCase()}
              </td>
              <td
                className={`px-4 py-1 whitespace-nowrap w-full ${
                  trade.status === "OPEN"
                    ? "text-blue-500"
                    : trade.status === "WIN"
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {trade.status.slice(0, 1) +
                  trade.status.slice(1, trade.status.length).toLowerCase()}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.status === "OPEN" ? (
                  "-"
                ) : (
                  <span
                    className={
                      trade.status === "WIN" ? "text-green-500" : "text-red-500"
                    }
                  >
                    {trade.status === "LOSS" ? "-" : ""}${trade.profitLoss}
                  </span>
                )}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.status === "OPEN" ? (
                  "-"
                ) : (
                  <span
                    className={
                      Number(
                        calcChange(
                          Number(trade.closingContractPrice),
                          Number(trade.contractPrice)
                        )
                      ) > 0
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {calcChange(
                      Number(trade.closingContractPrice),
                      Number(trade.contractPrice)
                    )}
                    %
                  </span>
                )}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.spotPrice}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.contractPrice}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.qty}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.strike}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {new Date(trade.dateBought).toLocaleDateString("en-GB")}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {new Date(trade.expiryDate).toLocaleDateString("en-GB")}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {Number(trade.closingSpotPrice) === 0
                  ? "-"
                  : trade.closingSpotPrice}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {Number(trade.closingContractPrice) === 0
                  ? "-"
                  : trade.closingContractPrice}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.strategy}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default withAuth(Page);
