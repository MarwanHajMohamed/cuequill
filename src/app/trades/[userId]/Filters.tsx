import { StrategyList } from "@/app/types/Trades";
import React from "react";
import { DateRangeControl } from "./DateRangeControl";
import { useScrollLock } from "@/hooks/useScrollLock";

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
  tag,
  setTag,
  tags,
  minReturn,
  setMinReturn,
  maxReturn,
  setMaxReturn,
  returnMin,
  returnMax,
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
  tag: string;
  setTag: React.Dispatch<React.SetStateAction<string>>;
  tags: string[];
  minReturn: number;
  setMinReturn: React.Dispatch<React.SetStateAction<number>>;
  maxReturn: number;
  setMaxReturn: React.Dispatch<React.SetStateAction<number>>;
  returnMin: number;
  returnMax: number;
  startDate: string;
  setStartDate: React.Dispatch<React.SetStateAction<string>>;
  endDate: string;
  setEndDate: React.Dispatch<React.SetStateAction<string>>;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const isPanelOpen = isOpen;
  const setIsPanelOpen = setIsOpen;

  // The panel is a persistent push-sidebar on desktop but a modal overlay on
  // mobile (<768px). Only lock background scroll in the mobile modal case, so
  // opening filters on desktop still lets you scroll the trades list.
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useScrollLock(isPanelOpen && isMobile);

  const activeFilterCount = [
    filter !== "All",
    strategy !== strategies[0],
    symbol !== symbols[0],
    option !== "All",
    tag !== "All",
    minReturn > returnMin,
    maxReturn < returnMax,
    !!startDate || !!endDate,
  ].filter(Boolean).length;

  const filterContent = (
    <div className="flex flex-col gap-5">
      {/* STATUS */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 tracking-wider">
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
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 tracking-wider">
          Strategy
        </div>
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as StrategyList)}
          className="w-full p-1.5 bg-white/[0.03] text-white text-xs xl:text-sm rounded cursor-pointer border border-white/10 transition duration-100 hover:border-white/40"
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
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 tracking-wider">
          Symbol
        </div>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-full p-1.5 bg-white/[0.03] text-xs xl:text-sm text-white rounded cursor-pointer border border-white/10 transition duration-100 hover:border-white/40"
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
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 tracking-wider">
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

      {/* TAG — only shown once the user has tagged at least one trade. */}
      {tags.length > 1 && (
        <>
          <div className="h-[1px] bg-white/10" />
          <div>
            <div className="text-[10px] xl:text-xs text-white/40 mb-2 tracking-wider">
              Tag
            </div>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full p-1.5 bg-white/[0.03] text-xs xl:text-sm text-white rounded cursor-pointer border border-white/10 transition duration-100 hover:border-white/40"
            >
              {tags.map((t, i) => (
                <option value={t} key={i}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="h-[1px] bg-white/10" />

      {/* RETURN % — realized-return window (net P/L as a % of premium).
          Covers losers (negative) and winners; each bound is "Any" until
          moved off its extreme. */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 tracking-wider">
          Return %
        </div>

        {/* Min bound */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/45">Min</span>
          <span
            className={`text-[11px] xl:text-xs font-medium tabular-nums ${
              minReturn > returnMin ? "text-teal-300" : "text-white/45"
            }`}
          >
            {minReturn > returnMin
              ? `≥ ${minReturn > 0 ? "+" : ""}${minReturn}%`
              : "Any"}
          </span>
        </div>
        <input
          type="range"
          min={returnMin}
          max={returnMax}
          step={5}
          value={minReturn}
          onChange={(e) => {
            const v = Number(e.target.value);
            setMinReturn(v);
            // Keep the window valid: never let Min pass Max.
            if (maxReturn < returnMax && v > maxReturn) setMaxReturn(v);
          }}
          className="w-full cursor-pointer accent-teal-400"
        />

        {/* Max bound */}
        <div className="flex items-center justify-between mb-1 mt-3">
          <span className="text-[10px] text-white/45">Max</span>
          <span
            className={`text-[11px] xl:text-xs font-medium tabular-nums ${
              maxReturn < returnMax ? "text-teal-300" : "text-white/45"
            }`}
          >
            {maxReturn < returnMax
              ? `≤ ${maxReturn > 0 ? "+" : ""}${maxReturn}%`
              : "Any"}
          </span>
        </div>
        <input
          type="range"
          min={returnMin}
          max={returnMax}
          step={5}
          value={Number.isFinite(maxReturn) ? maxReturn : returnMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            // Dragging fully right clears the upper bound.
            setMaxReturn(v >= returnMax ? Number.POSITIVE_INFINITY : v);
            // Keep the window valid: never let Max drop below Min.
            if (minReturn > returnMin && v < minReturn) setMinReturn(v);
          }}
          className="w-full cursor-pointer accent-teal-400"
        />

        <div className="flex justify-between text-[9px] text-white/30 mt-1 tabular-nums">
          <span>{returnMin}%</span>
          <span>+{returnMax}%</span>
        </div>
      </div>

      <div className="h-[1px] bg-white/10" />

      {/* DATE */}
      <div>
        <div className="text-[10px] xl:text-xs text-white/40 mb-2 tracking-wider">
          Date range
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
      {/* ── Floating "open filters" tab (visible when sidebar is hidden).
            Sits as a thin drawer-pull on the left edge of the viewport,
            half-faded at rest, full opacity on hover. Stays reachable
            without competing for attention with the trades table. ── */}
      <button
        onClick={() => setIsPanelOpen(true)}
        aria-label="Open filters"
        title="Filters"
        className={`filters-pull cursor-pointer fixed left-0 top-1/2 -translate-y-1/2 z-40 inline-flex items-center justify-center gap-1 w-7 h-12 rounded-r-xl bg-[var(--surface)] border border-l-0 border-white/15 text-white/80 hover:w-8 hover:text-white hover:bg-[var(--surface)] hover:border-white/30 opacity-95 hover:opacity-100 shadow-md transition-all duration-200 ${
          isPanelOpen
            ? "opacity-0 pointer-events-none -translate-x-4"
            : "pointer-events-auto"
        }`}
      >
        <i className="fa-solid fa-sliders text-[11px]" />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-semibold text-white shadow">
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

      {/* ── Pill sidebar - persistent push on desktop, modal overlay on
            mobile. Sits directly under the navbar pill. ── */}
      <aside
        className={`filters-aside fixed md:top-4 top-19 bottom-4 md:bottom-4 left-5 w-60 max-w-[85vw] bg-white/[0.03] md:backdrop-blur-md border border-white/10 rounded-2xl z-30 flex flex-col shadow-[0_8px_30px_var(--shadow,rgba(0,0,0,0.25))] transition-all duration-300 ease-out ${
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
          {filterContent}
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
                setTag("All");
                setMinReturn(returnMin);
                setMaxReturn(Number.POSITIVE_INFINITY);
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
