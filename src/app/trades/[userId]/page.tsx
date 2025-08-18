"use client";

import { useTrades } from "@/hooks/useTrades";
import React, { useEffect } from "react";

export default function page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = React.use(params);

  const { data: trades, isLoading, isError } = useTrades(userId);

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

  return (
    <div className="overflow-x-auto p-10">
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
                  trade.status === "OPEN" ? "text-green-500" : "text-red-500"
                }`}
              >
                {trade.status.slice(0, 1) +
                  trade.status.slice(1, trade.status.length).toLowerCase()}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.status === "OPEN" ? "-" : trade.status}
              </td>
              <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                {trade.status === "OPEN" ? "-" : trade.status}
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
