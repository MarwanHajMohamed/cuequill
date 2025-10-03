import { StrategyList } from "@/app/types/Trades";
import React from "react";

export default function Filters({
  filter,
  setFilter,
  strategy,
  setStrategy,
  strategies,
  symbol,
  setSymbol,
  option,
  setOption,
  symbols,
}: {
  filter: "All" | "Win" | "Loss";
  setFilter: React.Dispatch<React.SetStateAction<"All" | "Win" | "Loss">>;
  strategy: StrategyList;
  setStrategy: React.Dispatch<React.SetStateAction<StrategyList>>;
  strategies: StrategyList[];
  symbol: string;
  setSymbol: React.Dispatch<React.SetStateAction<string>>;
  option: "All" | "CALL" | "PUT";
  setOption: React.Dispatch<React.SetStateAction<"All" | "CALL" | "PUT">>;
  symbols: string[];
}) {
  return (
    <div className="flex items-end pb-5 w-full max-w-[1500px] gap-7 sticky top-0 bg-[#0E0E10]/80 h-40 backdrop-blur-xs">
      {/* STATUS FILTERING */}
      <div>
        <div className="text-xs text-white/40 mb-1">Status:</div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("All")}
            className={`border px-3 rounded cursor-pointer transition duration-100 ${
              filter === "All"
                ? "bg-blue-600/80 border-blue-600"
                : "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter("Win")}
            className={`border px-3 rounded cursor-pointer transition duration-100 ${
              filter === "Win"
                ? "bg-green-600/80 border-green-600"
                : "bg-green-600/10 border-green-600 hover:bg-green-600/60"
            }`}
          >
            Win
          </button>

          <button
            onClick={() => setFilter("Loss")}
            className={`border px-3 rounded cursor-pointer transition duration-100 ${
              filter === "Loss"
                ? "bg-red-600/80 border-red-600"
                : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
            }`}
          >
            Loss
          </button>
        </div>
      </div>

      <div className="w-[1px] h-6 bg-white/50"></div>

      {/* STRATEGIES FILTERING */}
      <div>
        <div className="text-xs text-white/40 mb-1">Strategies:</div>
        <select
          value={strategy}
          onChange={(e) => {
            setStrategy(e.target.value as StrategyList);
          }}
          className="p-1 bg-[#2b2b2f] text-white rounded"
        >
          {strategies.map((strategy, index) => {
            return (
              <option value={strategy} key={index}>
                {strategy}
              </option>
            );
          })}
        </select>
      </div>
      <div className="w-[1px] h-6 bg-white/50"></div>
      <div>
        <div className="text-xs text-white/40 mb-1">Symbol:</div>
        <select
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value);
          }}
          className="p-1 bg-[#2b2b2f] text-white rounded"
        >
          {symbols.map((symbol, index) => {
            return (
              <option value={symbol} key={index}>
                {symbol}
              </option>
            );
          })}
        </select>
      </div>
      <div className="w-[1px] h-6 bg-white/50"></div>

      {/* OPTION FILTERING */}
      <div>
        <div className="text-xs text-white/40 mb-1">Option:</div>
        <div className="flex gap-2">
          <button
            onClick={() => setOption("All")}
            className={`border px-3 rounded cursor-pointer transition duration-100 ${
              option === "All"
                ? "bg-blue-600/80 border-blue-600"
                : "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setOption("CALL")}
            className={`border px-3 rounded cursor-pointer transition duration-100 ${
              option === "CALL"
                ? "bg-green-600/80 border-green-600"
                : "bg-green-600/10 border-green-600 hover:bg-green-600/60"
            }`}
          >
            Call
          </button>

          <button
            onClick={() => setOption("PUT")}
            className={`border px-3 rounded cursor-pointer transition duration-100 ${
              option === "PUT"
                ? "bg-red-600/80 border-red-600"
                : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
            }`}
          >
            Put
          </button>
        </div>
      </div>
    </div>
  );
}
