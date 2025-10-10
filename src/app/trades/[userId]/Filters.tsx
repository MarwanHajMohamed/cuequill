import { StrategyList } from "@/app/types/Trades";
import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

function FormInput({ label, name, placeholder, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-xs text-white/40 mb-0.5">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        {...props}
        className={`w-full p-0.5 text-sm text-white bg-[#1A1A1D] rounded ${
          props.className || ""
        }`}
      />
    </div>
  );
}

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
  isFavourite,
  setIsFavourite,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
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
  isFavourite: boolean;
  setIsFavourite: React.Dispatch<React.SetStateAction<boolean>>;
  startDate: string;
  setStartDate: React.Dispatch<React.SetStateAction<string>>;
  endDate: string;
  setEndDate: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div
      className="flex flex-wrap items-end pb-5 w-full max-w-[1500px] gap-4 sticky top-0 pt-22
    bg-[#0E0E10]/80 backdrop-blur-xs z-2"
    >
      {/* STATUS FILTERING */}
      <div>
        <div className="text-xs text-white/40 mb-1">Status:</div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("All")}
            className={`border px-2 rounded cursor-pointer transition duration-100 text-sm ${
              filter === "All"
                ? "bg-blue-600/80 border-blue-600"
                : "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter("Win")}
            className={`border px-2 text-sm rounded cursor-pointer transition duration-100 ${
              filter === "Win"
                ? "bg-green-600/80 border-green-600"
                : "bg-green-600/10 border-green-600 hover:bg-green-600/60"
            }`}
          >
            Win
          </button>

          <button
            onClick={() => setFilter("Loss")}
            className={`border px-2 text-sm rounded cursor-pointer transition duration-100 ${
              filter === "Loss"
                ? "bg-red-600/80 border-red-600"
                : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
            }`}
          >
            Loss
          </button>
        </div>
      </div>

      <div className="w-[1px] h-5 bg-white/50"></div>

      {/* STRATEGIES FILTERING */}
      <div>
        <div className="text-xs text-white/40 mb-1">Strategies:</div>
        <select
          value={strategy}
          onChange={(e) => {
            setStrategy(e.target.value as StrategyList);
          }}
          className="p-0.5 bg-[#1A1A1D] text-white text-sm rounded cursor-pointer border border-white/0
          transition duration-100 hover:border-white/60"
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
      <div className="w-[1px] h-5 bg-white/50"></div>
      <div>
        <div className="text-xs text-white/40 mb-1">Symbol:</div>
        <select
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value);
          }}
          className="p-0.5 bg-[#1A1A1D] text-sm text-white rounded cursor-pointer border border-white/0
          transition duration-100 hover:border-white/60"
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
      <div className="w-[1px] h-5 bg-white/50"></div>

      {/* OPTION FILTERING */}
      <div>
        <div className="text-xs text-white/40 mb-1">Option:</div>
        <div className="flex gap-2">
          <button
            onClick={() => setOption("All")}
            className={`border px-2 text-sm rounded cursor-pointer transition duration-100 ${
              option === "All"
                ? "bg-blue-600/80 border-blue-600"
                : "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setOption("CALL")}
            className={`border px-2 text-sm rounded cursor-pointer transition duration-100 ${
              option === "CALL"
                ? "bg-green-600/80 border-green-600"
                : "bg-green-600/10 border-green-600 hover:bg-green-600/60"
            }`}
          >
            Call
          </button>

          <button
            onClick={() => setOption("PUT")}
            className={`border px-2 text-sm rounded cursor-pointer transition duration-100 ${
              option === "PUT"
                ? "bg-red-600/80 border-red-600"
                : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
            }`}
          >
            Put
          </button>
        </div>
      </div>

      {/* DATE FILTERING */}
      <div className="w-[1px] h-5 bg-white/50"></div>
      <div className="flex gap-2 items-end">
        <FormInput
          label="From"
          name="from"
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
          }}
        />
        <FormInput
          label="To"
          name="to"
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => {
            setEndDate(e.target.value);
          }}
        />
        <div>
          <div></div>
          <i
            className="fa-solid fa-rotate text-white/40 cursor-pointer transition duration-100 hover:rotate-30"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          ></i>
        </div>
      </div>

      {/* FAVOURITE FILTERING */}
      <div className="w-[1px] h-5 bg-white/50"></div>
      <div
        className="flex gap-1 items-center cursor-pointer"
        onClick={() => setIsFavourite(!isFavourite)}
      >
        <i
          className={`fa-${isFavourite ? "solid" : "regular"} fa-star 
                    ${
                      isFavourite
                        ? "text-yellow-300 hover:text-yellow-500"
                        : "text-white/30 hover:text-white/100"
                    } 
                    cursor-pointer transition duration-100`}
        ></i>
        <div className="text-sm">Favourites</div>
      </div>
    </div>
  );
}
