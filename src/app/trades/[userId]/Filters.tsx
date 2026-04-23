import { StrategyList } from "@/app/types/Trades";
import React, { useState, useEffect } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

function FormInput({ label, name, placeholder, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={name}
          className="block text-[10px] xl:text-xs text-white/40 mb-0.5"
        >
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        {...props}
        className={`w-full p-0.5 text-xs xl:text-sm text-white bg-[#1A1A1D] rounded ${
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
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isPanelOpen]);

  const activeFilterCount = [
    filter !== "All",
    strategy !== strategies[0],
    symbol !== symbols[0],
    option !== "All",
    !!startDate || !!endDate,
    isFavourite,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="flex flex-col gap-5">
      {/* STATUS */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 uppercase tracking-wider">
          Status
        </div>
        <div className="flex gap-2">
          {(["All", "Win", "Loss"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`border px-3 py-1 rounded cursor-pointer transition duration-100 text-xs xl:text-sm ${
                filter === val
                  ? val === "All"
                    ? "bg-blue-600/80 border-blue-600"
                    : val === "Win"
                    ? "bg-green-600/80 border-green-600"
                    : "bg-red-600/80 border-red-600"
                  : val === "All"
                  ? "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
                  : val === "Win"
                  ? "bg-green-600/10 border-green-600 hover:bg-green-600/60"
                  : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-white/10" />

      {/* STRATEGY */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 uppercase tracking-wider">
          Strategy
        </div>
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as StrategyList)}
          className="w-full p-1.5 bg-[#1A1A1D] text-white text-xs xl:text-sm rounded cursor-pointer border border-white/10 transition duration-100 hover:border-white/40"
        >
          {strategies.map((s, i) => (
            <option value={s} key={i}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="h-[1px] bg-white/10" />

      {/* SYMBOL */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 uppercase tracking-wider">
          Symbol
        </div>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-full p-1.5 bg-[#1A1A1D] text-xs xl:text-sm text-white rounded cursor-pointer border border-white/10 transition duration-100 hover:border-white/40"
        >
          {symbols.map((s, i) => (
            <option value={s} key={i}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="h-[1px] bg-white/10" />

      {/* OPTION */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 uppercase tracking-wider">
          Option
        </div>
        <div className="flex gap-2">
          {(["All", "CALL", "PUT"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setOption(val)}
              className={`border px-3 py-1 text-xs xl:text-sm rounded cursor-pointer transition duration-100 ${
                option === val
                  ? val === "All"
                    ? "bg-blue-600/80 border-blue-600"
                    : val === "CALL"
                    ? "bg-green-600/80 border-green-600"
                    : "bg-red-600/80 border-red-600"
                  : val === "All"
                  ? "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
                  : val === "CALL"
                  ? "bg-green-600/10 border-green-600 hover:bg-green-600/60"
                  : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
              }`}
            >
              {val === "CALL" ? "Call" : val === "PUT" ? "Put" : val}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-white/10" />

      {/* DATE */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 uppercase tracking-wider flex justify-between items-center">
          <div>Date Range</div>
          <i
            className="fa-solid fa-rotate text-sm text-white/40 cursor-pointer transition duration-100 hover:rotate-30 md:mb-1"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          />
        </div>
        <div className="flex gap-2 flex-col items-start">
          <div className="flex-1">
            <FormInput
              label="From"
              name="from"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-white/10 p-1.5"
            />
          </div>
          <div className="flex-1">
            <FormInput
              label="To"
              name="to"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-white/10 p-1.5"
            />
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-white/10" />

      {/* FAVOURITES */}
      <div
        className="flex gap-2 items-center cursor-pointer group"
        onClick={() => setIsFavourite(!isFavourite)}
      >
        <i
          className={`fa-${isFavourite ? "solid" : "regular"} fa-star text-sm ${
            isFavourite
              ? "text-yellow-300"
              : "text-white/30 group-hover:text-white/70"
          } transition duration-100`}
        />
        <div className="text-sm text-white/70 group-hover:text-white transition duration-100">
          Favourites only
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP: inline bar ── */}
      <div className="hidden min-[1130px]:flex w-full max-w-[1500px] sticky top-0 bg-[#0E0E10]/80 backdrop-blur-xs z-2 items-end pb-5 pt-22 gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-3 items-end">
          {/* STATUS */}
          <div>
            <div className="text-[10px] xl:text-xs text-white/40 mb-1">
              Status:
            </div>
            <div className="flex gap-2">
              {(["All", "Win", "Loss"] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`border px-2 rounded cursor-pointer transition duration-100 text-xs xl:text-sm ${
                    filter === val
                      ? val === "All"
                        ? "bg-blue-600/80 border-blue-600"
                        : val === "Win"
                        ? "bg-green-600/80 border-green-600"
                        : "bg-red-600/80 border-red-600"
                      : val === "All"
                      ? "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
                      : val === "Win"
                      ? "bg-green-600/10 border-green-600 hover:bg-green-600/60"
                      : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
          <div className="w-[1px] h-5 bg-white/50 self-end mb-1" />

          {/* STRATEGY */}
          <div>
            <div className="text-[10px] xl:text-xs text-white/40 mb-1">
              Strategies:
            </div>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as StrategyList)}
              className="p-0.5 bg-[#1A1A1D] text-white text-xs xl:text-sm rounded cursor-pointer border border-white/0 transition duration-100 hover:border-white/60"
            >
              {strategies.map((s, i) => (
                <option value={s} key={i}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[1px] h-5 bg-white/50 self-end mb-1" />

          {/* SYMBOL */}
          <div>
            <div className="text-[10px] xl:text-xs text-white/40 mb-1">
              Symbol:
            </div>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="p-0.5 bg-[#1A1A1D] text-xs xl:text-sm text-white rounded cursor-pointer border border-white/0 transition duration-100 hover:border-white/60"
            >
              {symbols.map((s, i) => (
                <option value={s} key={i}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[1px] h-5 bg-white/50 self-end mb-1" />

          {/* OPTION */}
          <div>
            <div className="text-[10px] xl:text-xs text-white/40 mb-1">
              Option:
            </div>
            <div className="flex gap-2">
              {(["All", "CALL", "PUT"] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setOption(val)}
                  className={`border px-2 text-xs xl:text-sm rounded cursor-pointer transition duration-100 ${
                    option === val
                      ? val === "All"
                        ? "bg-blue-600/80 border-blue-600"
                        : val === "CALL"
                        ? "bg-green-600/80 border-green-600"
                        : "bg-red-600/80 border-red-600"
                      : val === "All"
                      ? "bg-blue-600/10 border-blue-600 hover:bg-blue-600/60"
                      : val === "CALL"
                      ? "bg-green-600/10 border-green-600 hover:bg-green-600/60"
                      : "bg-red-600/10 border-red-600 hover:bg-red-600/60"
                  }`}
                >
                  {val === "CALL" ? "Call" : val === "PUT" ? "Put" : val}
                </button>
              ))}
            </div>
          </div>
          <div className="w-[1px] h-5 bg-white/50 self-end mb-1" />

          {/* DATE */}
          <div className="flex gap-2 items-end">
            <FormInput
              label="From"
              name="from"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <FormInput
              label="To"
              name="to"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="w-[1px] h-5 bg-white/50 self-end mb-1" />

          {/* FAVOURITES */}
          <div
            className="flex gap-1 items-end mb-1 cursor-pointer"
            onClick={() => setIsFavourite(!isFavourite)}
          >
            <i
              className={`fa-${
                isFavourite ? "solid" : "regular"
              } fa-star text-xs xl:text-sm ${
                isFavourite
                  ? "text-yellow-300 hover:text-yellow-500"
                  : "text-white/30 hover:text-white/100"
              } cursor-pointer transition duration-100`}
            />
            <div className="xl:text-sm text-xs">Favourites</div>
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="min-[1130px]:hidden sticky mt-15 top-0 bg-[#0E0E10]/80 backdrop-blur-xs z-20 flex items-center flex flex-col gap-2 justify-between px-4 py-3">
        <button
          onClick={() => setIsPanelOpen(true)}
          className="flex items-center gap-2 border border-white/20 px-3 py-1.5 rounded-lg text-xs text-white/70 hover:text-white hover:border-white/40 transition duration-150 relative"
        >
          <i className="fa-solid fa-sliders text-xs" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Active filter pills summary */}
        {activeFilterCount > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {filter !== "All" && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  filter === "Win"
                    ? "bg-green-600/20 border-green-600/50 text-green-400"
                    : "bg-red-600/20 border-red-600/50 text-red-400"
                }`}
              >
                {filter}
              </span>
            )}
            {option !== "All" && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  option === "CALL"
                    ? "bg-green-600/20 border-green-600/50 text-green-400"
                    : "bg-red-600/20 border-red-600/50 text-red-400"
                }`}
              >
                {option === "CALL" ? "Call" : "Put"}
              </span>
            )}
            {symbol !== symbols[0] && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 bg-white/5 text-white/60">
                {symbol}
              </span>
            )}
            {isFavourite && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
                ★ Fav
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── MOBILE: backdrop ── */}
      <div
        onClick={() => setIsPanelOpen(false)}
        className={`min-[1130px]:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300 ${
          isPanelOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── MOBILE: slide-in side panel ── */}
      <div
        className={`min-[1130px]:hidden z-2000 fixed top-0 right-0 h-full w-72 bg-[#111113] border-l border-white/10 z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-sliders text-sm text-white/60" />
            <span className="text-sm font-medium text-white">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsPanelOpen(false)}
            className="text-white/40 hover:text-white transition duration-100 p-1"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <FilterContent />
        </div>

        {/* Panel footer */}
        {activeFilterCount > 0 && (
          <div className="px-5 py-4 border-t border-white/10 shrink-0">
            <button
              onClick={() => {
                setFilter("All");
                setStrategy(strategies[0]);
                setSymbol(symbols[0]);
                setOption("All");
                setStartDate("");
                setEndDate("");
                setIsFavourite(false);
              }}
              className="w-full py-2 text-xs text-white/60 border border-white/15 rounded-lg hover:text-white hover:border-white/30 transition duration-150"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
