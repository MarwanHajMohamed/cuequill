import { StrategyList } from "@/app/types/Trades";
import React from "react";
import { DateRangeControl } from "./DateRangeControl";

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
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isOpen,
  setIsOpen,
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
  startDate: string;
  setStartDate: React.Dispatch<React.SetStateAction<string>>;
  endDate: string;
  setEndDate: React.Dispatch<React.SetStateAction<string>>;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const isPanelOpen = isOpen;
  const setIsPanelOpen = setIsOpen;

  const activeFilterCount = [
    filter !== "All",
    strategy !== strategies[0],
    symbol !== symbols[0],
    option !== "All",
    !!startDate || !!endDate,
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
              className={`px-3 py-1 rounded-full border cursor-pointer transition text-xs xl:text-sm font-medium ${
                filter === val
                  ? val === "All"
                    ? "bg-white/10 text-white border-white/15"
                    : val === "Win"
                      ? "bg-green-500/15 text-green-300 border-green-500/30"
                      : "bg-red-500/15 text-red-300 border-red-500/30"
                  : "bg-white/[0.03] text-white/55 border-white/10 hover:bg-white/[0.06] hover:text-white"
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
              className={`px-3 py-1 text-xs xl:text-sm rounded-full border cursor-pointer transition font-medium ${
                option === val
                  ? val === "All"
                    ? "bg-white/10 text-white border-white/15"
                    : val === "CALL"
                      ? "bg-green-500/15 text-green-300 border-green-500/30"
                      : "bg-red-500/15 text-red-300 border-red-500/30"
                  : "bg-white/[0.03] text-white/55 border-white/10 hover:bg-white/[0.06] hover:text-white"
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
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 uppercase tracking-wider">
          Date Range
        </div>
        <DateRangeControl
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          variant="stacked"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* ── Floating "open filters" pill (visible when sidebar is hidden) ── */}
      <button
        onClick={() => setIsPanelOpen(true)}
        aria-label="Open filters"
        className={`cursor-pointer fixed left-5 md:left-[max(40px,calc((100vw-1580px)/2+40px))] top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 bg-[#16151C]/90 backdrop-blur-sm border border-white/15 rounded-full px-3 py-2 text-xs text-white/70 hover:text-white hover:border-white/30 shadow-lg transition duration-200 ${
          isPanelOpen
            ? "opacity-0 pointer-events-none -translate-x-4"
            : "opacity-100 pointer-events-auto"
        }`}
      >
        <i className="fa-solid fa-sliders text-sm" />
        {activeFilterCount > 0 && (
          <span className="min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-semibold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* ── Mobile-only backdrop (sidebar behaves like a modal here) ── */}
      <div
        onClick={() => setIsPanelOpen(false)}
        className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity duration-300 ${
          isPanelOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Pill sidebar — persistent push on desktop, modal overlay on
            mobile. Sits directly under the navbar pill. ── */}
      <aside
        className={`fixed md:top-[100px] top-19 bottom-4 md:bottom-5 left-5 md:left-[max(40px,calc((100vw-1580px)/2+40px))] w-60 max-w-[85vw] bg-[#111113] border border-white/10 rounded-3xl z-30 flex flex-col shadow-2xl transition-all duration-300 ease-out ${
          isPanelOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-[120%] opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-sliders text-sm text-white/60" />
            <span className="text-sm font-medium text-white">Filters</span>
            {activeFilterCount > 0 && (
              <span className="min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsPanelOpen(false)}
            aria-label="Close filters"
            className="text-white/40 hover:text-white transition duration-100 p-1 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <FilterContent />
        </div>

        {/* Footer */}
        {activeFilterCount > 0 && (
          <div className="px-5 py-4 border-t border-white/5 shrink-0">
            <button
              onClick={() => {
                setFilter("All");
                setStrategy(strategies[0]);
                setSymbol(symbols[0]);
                setOption("All");
                setStartDate("");
                setEndDate("");
              }}
              className="w-full py-2 text-xs text-white/60 border border-white/15 rounded-lg hover:text-white hover:border-white/30 transition duration-150 cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
