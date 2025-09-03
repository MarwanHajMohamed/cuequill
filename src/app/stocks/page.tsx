import React from "react";

const stockData = [
  { name: "SPY", cost: "0.25 - 0.30", volume: "20", distance: "10" },
  { name: "QQQ", cost: "0.25 - 0.30", volume: "20", distance: "10" },
  { name: "META", cost: "0.45 - 0.80", volume: "3", distance: "20-25" },
  { name: "AAPL", cost: "0.45 - 0.80", volume: "20-25", distance: "2-4" },
  { name: "AMZN", cost: "0.60 - 0.80", volume: "16", distance: "7-8" },
  { name: "NFLX", cost: "1.5 - 2.5", volume: "1", distance: "12-15" },
  { name: "MRNA", cost: "1.0 - 2.0", volume: "2", distance: "12-15" },
  { name: "TSLA", cost: "2.5", volume: "15", distance: "8-10" },
  { name: "TNA", cost: "0.60 - 0.80", volume: "2", distance: "8-13" },
  { name: "GLD", cost: "0.60 - 0.80", volume: "2", distance: "2-4" },
  { name: "SLV", cost: "0.10 - 0.20", volume: "10", distance: "1-2" },
  { name: "USO", cost: "0.10 - 0.20", volume: "1", distance: "2-3" },
  { name: "BAC", cost: "0.10 - 0.20", volume: "10", distance: "1-2" },
  { name: "CVX", cost: "0.60 - 0.80", volume: "2", distance: "3-5" },
  { name: "XOM", cost: "0.60 - 0.80", volume: "4", distance: "3-5" },
  { name: "NVDA", cost: "0.60 - 0.80", volume: "120", distance: "6-9" },
];

export default function page() {
  return (
    <div className="m-10 mt-25 flex items-center justify-center">
      <table className="border border-white/10">
        <thead>
          <tr className="text-teal-500 text-left">
            <th className="p-2 px-5">Stock / ETF</th>
            <th className="p-2 px-5">Cost ($)</th>
            <th className="p-2 px-5">Volume (M)</th>
            <th className="p-2 px-5">Distance (Spot - Strike)</th>
          </tr>
        </thead>
        <tbody>
          {stockData.map((item, index) => (
            <tr
              key={item.name}
              className={index % 2 === 0 ? "bg-[#1a1a1d]" : "bg-[#131316]"}
            >
              <td className="p-2 px-5">{item.name}</td>
              <td className="p-2 px-5">{item.cost}</td>
              <td className="p-2 px-5">{item.volume}</td>
              <td className="p-2 px-5">{item.distance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
