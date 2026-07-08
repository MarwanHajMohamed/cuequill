"use client";

import TradeModal from "@/app/dashboard/components/modals/TradeModal";
import { StrategyList, Trade } from "@/app/types/Trades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { withAuth } from "@/lib/withAuth";
import { useQueryClient } from "@tanstack/react-query";
import React, { use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NotesModal from "../NotesModal";
import ImportedTradesModal from "../ImportedTradesModal";
import { useToast } from "@/hooks/useToast";
import {
  handleDeleteTrade,
  handleSaveNotes,
  handleSaveTrade,
} from "../../../handlers/tradeHandlers";
import Filters from "./Filters";
import Statistics from "./Statistics";
import { AnimatePresence, motion } from "framer-motion";
import { HeroSkeleton, TableSkeleton } from "@/components/Loaders";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

import { fmtMoneyCompact } from "@/lib/helpers/fmt";
// Every column the trades table can render. Order here is the default;
// users can reorder and hide columns, persisted in localStorage.
type TradeColumnKey =
  | "symbol"
  | "option"
  | "status"
  | "netpl"
  | "change"
  | "contractPrice"
  | "qty"
  | "strike"
  | "dateBought"
  | "expiryDate"
  | "closingContractPrice"
  | "strategy"
  | "notes";

const DEFAULT_COLUMN_ORDER: TradeColumnKey[] = [
  "symbol",
  "option",
  "status",
  "netpl",
  "change",
  "contractPrice",
  "qty",
  "strike",
  "dateBought",
  "expiryDate",
  "closingContractPrice",
  "strategy",
  "notes",
];

const COLUMN_LABELS: Record<TradeColumnKey, string> = {
  symbol: "Symbol",
  option: "PUT/CALL",
  status: "Status",
  netpl: "Net P/L",
  change: "Change %",
  contractPrice: "Contract price",
  qty: "Qty",
  strike: "Strike",
  dateBought: "Date bought",
  expiryDate: "Expiry date",
  closingContractPrice: "Closing contract price",
  strategy: "Strategy",
  notes: "Notes",
};

// Reconcile a stored order with the known columns: keep the saved order,
// drop unknown keys, and append any columns added since (so a new release
// that introduces a column doesn't leave it permanently hidden).
function reconcileOrder(stored: TradeColumnKey[]): TradeColumnKey[] {
  const seen = new Set<TradeColumnKey>();
  const out: TradeColumnKey[] = [];
  for (const k of stored) {
    if (DEFAULT_COLUMN_ORDER.includes(k) && !seen.has(k)) {
      out.push(k);
      seen.add(k);
    }
  }
  for (const k of DEFAULT_COLUMN_ORDER) if (!seen.has(k)) out.push(k);
  return out;
}

function Page({ params }: { params: Promise<{ userId: string }> }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const toast = useToast();
  const today = new Date();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { userId } = use(params);
  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  // USE STATES
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [strategy, setStrategy] = useState<StrategyList>("All");
  const [symbol, setSymbol] = useState<string>("All");
  const [filter, setFilter] = useState<"All" | "Win" | "Loss">("All");
  const [option, setOption] = useState<"All" | "CALL" | "PUT">("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  // +1 = moving forward (slide left from right), -1 = moving back.
  const [pageDir, setPageDir] = useState<1 | -1>(1);
  const goToPage = (next: number) => {
    setPageDir(next > currentPage ? 1 : -1);
    setCurrentPage(next);
  };
  const [syncing, setSyncing] = useState<boolean>(false);
  const [showImported, setShowImported] = useState<boolean>(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const tradesPerPage = 15;

  // ── Merge state ────────────────────────────────────────────────────
  // Selection mode: shows a checkbox column and turns row clicks into
  // toggles instead of navigation. Rows can only be merged if they
  // share the same contract (symbol/side/strike/expiry-day), the same
  // open/closed bucket, and the same simulated flag — that's the same
  // validation the server enforces.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  // Snapshot of the most recent merge, kept in memory long enough for
  // the user to click Undo. `originals` is the exact array of docs
  // the merge endpoint deleted; we hand it back to the undo endpoint
  // as-is.
  const [lastMerge, setLastMerge] = useState<{
    mergedId: string;
    originals: unknown[];
    count: number;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  // Position of the Siri ring that wraps the currently merging rows.
  // Measured from data-trade-id attributes on the rendered <tr>s so
  // the ring hugs the exact vertical span, even when rows aren't
  // adjacent. Recomputed on merge/select changes and resize.
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const [siriBox, setSiriBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  useLayoutEffect(() => {
    if (!merging || selectedIds.size === 0 || !tableWrapRef.current) {
      setSiriBox(null);
      return;
    }
    const wrap = tableWrapRef.current;
    const measure = () => {
      const wrapRect = wrap.getBoundingClientRect();
      let top = Infinity;
      let bottom = -Infinity;
      for (const id of selectedIds) {
        const el = wrap.querySelector<HTMLElement>(
          `[data-trade-id="${id}"]`,
        );
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < top) top = r.top;
        if (r.bottom > bottom) bottom = r.bottom;
      }
      const table = wrap.querySelector("table");
      if (!table || !Number.isFinite(top) || !Number.isFinite(bottom)) {
        setSiriBox(null);
        return;
      }
      const tRect = table.getBoundingClientRect();
      // Pad the ring slightly outside the rows so it reads as a halo
      // rather than a tight border on the row hairlines.
      const PAD = 4;
      setSiriBox({
        top: top - wrapRect.top + wrap.scrollTop - PAD,
        left: tRect.left - wrapRect.left + wrap.scrollLeft - PAD,
        width: tRect.width + PAD * 2,
        height: bottom - top + PAD * 2,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [merging, selectedIds]);
  // Auto-dismiss the undo pill after ~20s so it doesn't linger
  // forever. Any new merge replaces the previous snapshot outright.
  useEffect(() => {
    if (!lastMerge) return;
    const t = setTimeout(() => setLastMerge(null), 20000);
    return () => clearTimeout(t);
  }, [lastMerge]);
  const clearSelection = () => setSelectedIds(new Set());
  const handleUndoMerge = async () => {
    if (!lastMerge || undoing) return;
    setUndoing(true);
    try {
      const res = await fetch("/api/trades/merge/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mergedId: lastMerge.mergedId,
          originals: lastMerge.originals,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(`Undo failed: ${data.error ?? "Unknown error"}`);
        return;
      }
      toast(`Restored ${lastMerge.count} trades.`);
      setLastMerge(null);
      await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
    } catch (err) {
      toast(
        `Undo failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setUndoing(false);
    }
  };
  const handleMergeConfirm = async () => {
    if (merging) return;
    const ids = Array.from(selectedIds);
    if (ids.length < 2) return;
    setMerging(true);
    try {
      const res = await fetch("/api/trades/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(`Merge failed: ${data.error ?? "Unknown error"}`);
        return;
      }
      toast(`Merged ${ids.length} trades into one.`);
      setMergeConfirmOpen(false);
      exitSelectMode();
      const mergedId: string | undefined = data?.trade?._id;
      const originals: unknown[] = Array.isArray(data?.originals)
        ? data.originals
        : [];
      if (mergedId && originals.length >= 2) {
        setLastMerge({ mergedId, originals, count: ids.length });
      }
      await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
    } catch (err) {
      toast(
        `Merge failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setMerging(false);
    }
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    clearSelection();
  };
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expiryDayKey = (d: string | Date) =>
    new Date(d).toISOString().split("T")[0];
  const isMergeableWithSeed = (seed: Trade, t: Trade) => {
    if (t.symbol !== seed.symbol) return false;
    if (t.option !== seed.option) return false;
    if (t.strike !== seed.strike) return false;
    if (expiryDayKey(t.expiryDate) !== expiryDayKey(seed.expiryDate))
      return false;
    if (!!t.simulated !== !!seed.simulated) return false;
    const seedClosed = seed.status !== "OPEN";
    const tClosed = t.status !== "OPEN";
    if (seedClosed !== tClosed) return false;
    return true;
  };

  // ── Column customization (order + visibility), persisted locally ──────
  const [storedOrder, setStoredOrder] = useLocalStorage<TradeColumnKey[]>(
    "tradeColumnOrder",
    DEFAULT_COLUMN_ORDER,
  );
  const [hiddenColumns, setHiddenColumns] = useLocalStorage<TradeColumnKey[]>(
    "tradeHiddenColumns",
    [],
  );
  const [isColumnsOpen, setIsColumnsOpen] = useState<boolean>(false);
  const dragKey = useRef<TradeColumnKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<TradeColumnKey | null>(null);
  // Mirrors `dragKey.current` as state so the table can re-render and
  // highlight every cell in the column being dragged (the ref doesn't
  // trigger a render on its own).
  const [draggingKey, setDraggingKey] = useState<TradeColumnKey | null>(null);

  const columnOrder = reconcileOrder(storedOrder);
  const hiddenSet = new Set(hiddenColumns);
  const visibleColumns = columnOrder.filter((k) => !hiddenSet.has(k));

  const moveColumn = (from: TradeColumnKey, to: TradeColumnKey) => {
    if (from === to) return;
    const arr = [...columnOrder];
    const fromIdx = arr.indexOf(from);
    const toIdx = arr.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return;
    arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, from);
    setStoredOrder(arr);
  };

  const toggleColumn = (key: TradeColumnKey) => {
    setHiddenColumns((prev) => {
      const isHidden = prev.includes(key);
      // Never let the user hide the final visible column - an empty table
      // is useless and there'd be no header left to toggle from.
      if (!isHidden && visibleColumns.length <= 1) return prev;
      return isHidden ? prev.filter((k) => k !== key) : [...prev, key];
    });
  };

  const resetColumns = () => {
    setStoredOrder(DEFAULT_COLUMN_ORDER);
    setHiddenColumns([]);
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/ibkr/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast(`Sync failed: ${data.error ?? "Unknown error"}`);
        return;
      }
      const inserted = data.inserted ?? 0;
      const skipped = data.skipped ?? 0;
      if (inserted === 0) {
        toast(
          `Already up to date - no new trades${skipped ? ` (${skipped} skipped)` : ""}`,
        );
      } else {
        toast(
          `Imported ${inserted} new trade${inserted === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped)` : ""}`,
        );
        await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
        // Auto-open the imported-trades modal so the user can verify or
        // delete any duplicates the dedupe pass didn't catch.
        setShowImported(true);
      }
    } catch (err) {
      toast(
        `Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsColumnsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Reset back to page 1 whenever any filter changes. Without this,
  // narrowing a list while on page 17 leaves you stranded past the end
  // of the new results and the table looks empty.
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, strategy, symbol, option, startDate, endDate]);

  if (isLoading)
    return (
      <div className="w-full flex justify-center mt-19 md:mt-[100px]">
        <div className="w-full max-w-[1500px] px-5 md:px-10 pb-10">
          <HeroSkeleton />
          <TableSkeleton rows={10} columns={7} />
        </div>
      </div>
    );
  if (isError)
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-screen px-5 gap-3">
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
          <i className="fa-solid fa-triangle-exclamation text-red-300 text-lg" />
        </div>
        <div className="text-[12px] tracking-[0.1em] text-white/40 font-medium">
          Could not load
        </div>
        <div className="text-lg font-semibold">Trades unavailable</div>
        <div className="text-sm text-white/55 max-w-sm text-center">
          We couldn&apos;t reach the journal. Check your connection and
          retry.
        </div>
      </div>
    );

  const strategies: StrategyList[] = [
    "All",
    "Moving Average 40",
    "Normal Fall & Hard Fall",
    "Bearish Channel Break",
    "Normal Bullish Gap",
    "Bearish Gap Uptrend",
    "Hard Floor",
    "The First Uptrend Gap",
    "First Red Opening Candle",
    "Gap Floor Break",
    "Model of 4 Steps",
    "Hanger in Daily",
    "Other",
  ];

  const symbols = [
    "All",
    ...Array.from(new Set(trades?.map((trade: Trade) => trade.symbol) || [])),
  ];

  const calcChange = (newPrice: number, oldPrice: number) => {
    return (((newPrice - oldPrice) / oldPrice) * 100).toFixed(0);
  };

  const cap = (s: string) => s.slice(0, 1) + s.slice(1).toLowerCase();

  // Renders the cell content for a given column. Kept in one place so the
  // header order and the row order stay in lockstep automatically.
  const renderCell = (key: TradeColumnKey, trade: Trade): React.ReactNode => {
    const isClosed = trade.status !== "OPEN";
    switch (key) {
      case "symbol":
        return trade.symbol;
      case "option":
        return (
          <span
            className={
              trade.option === "CALL" ? "text-green-500" : "text-red-500"
            }
          >
            {cap(trade.option)}
          </span>
        );
      case "status":
        return (
          <span
            className={
              trade.status === "OPEN"
                ? "text-blue-500"
                : trade.status === "WIN"
                  ? "text-green-500"
                  : "text-red-500"
            }
          >
            {cap(trade.status)}
          </span>
        );
      case "netpl":
        return !isClosed ? (
          "-"
        ) : (
          <span
            className={
              trade.status === "WIN" ? "text-green-500" : "text-red-500"
            }
          >
            {fmtMoneyCompact(tradeNetPL(trade))}
          </span>
        );
      case "change": {
        if (!isClosed) return "-";
        const pct = Number(
          calcChange(
            Number(trade.closingContractPrice),
            Number(trade.contractPrice),
          ),
        );
        return (
          <span className={pct > 0 ? "text-green-500" : "text-red-500"}>
            {calcChange(
              Number(trade.closingContractPrice),
              Number(trade.contractPrice),
            )}
            %
          </span>
        );
      }
      case "contractPrice":
        return trade.contractPrice;
      case "qty":
        return trade.qty;
      case "strike":
        return trade.strike;
      case "dateBought":
        return new Date(trade.dateBought).toLocaleDateString("en-GB");
      case "expiryDate":
        return new Date(trade.expiryDate).toLocaleDateString("en-GB");
      case "closingContractPrice":
        return trade.closingContractPrice === null
          ? "-"
          : trade.closingContractPrice;
      case "strategy":
        return trade.strategy;
      case "notes":
        return trade.notes !== "" ? (
          <i
            className="fa-solid fa-book-open cursor-pointer text-white/70 transition duration-100 hover:text-white/100 text-lg"
            onClick={(e) => {
              e.stopPropagation();
              setIsNotesOpen(true);
              setEditingTrade(trade);
              setNotes(trade.notes || "");
            }}
          ></i>
        ) : (
          <i
            className="fa-solid fa-book cursor-pointer text-white/20 transition duration-100 hover:text-white/100 text-lg"
            onClick={(e) => {
              e.stopPropagation();
              setIsNotesOpen(true);
              setEditingTrade(trade);
              setNotes(trade.notes || "");
            }}
          ></i>
        );
      default:
        return null;
    }
  };

  const filteredTrades =
    trades &&
    trades.filter((trade) => {
      // Filter by status
      if (filter === "Win" && trade.status !== "WIN") return false;
      if (filter === "Loss" && trade.status !== "LOSS") return false;

      // Filter by strategy
      if (strategy !== "All" && trade.strategy !== strategy) return false;

      // Filter by symbol
      if (symbol !== "All" && trade.symbol !== symbol) return false;

      // Filter by option
      if (option !== "All" && trade.option !== option) return false;

      // Date range matches on the trade's EXIT date for closed trades
      // and ENTRY date for open ones - same convention used by the
      // calendar, monthly stats, and P/L attribution. This keeps WTD /
      // MTD / YTD totals consistent across every section of the page.
      const isClosed = trade.status === "WIN" || trade.status === "LOSS";
      const tradeDateStr =
        isClosed && trade.dateClosed ? trade.dateClosed : trade.dateBought;
      const tradeDate = new Date(tradeDateStr);
      const from = startDate ? new Date(startDate) : null;
      // Use inclusive end-of-day for `to` so a trade closed at 3:55pm on
      // the end date isn't excluded by midnight comparison.
      const to = endDate ? new Date(endDate + "T23:59:59") : null;

      if (from && tradeDate < from) return false;
      if (to && tradeDate > to) return false;

      return true;
    });

  // Pagination controls
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = filteredTrades?.slice(
    indexOfFirstTrade,
    indexOfLastTrade,
  );

  const totalPages = Math.ceil((filteredTrades?.length || 0) / tradesPerPage);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      {!trades || trades.length === 0 ? (
        <div className="flex flex-col gap-3 items-center h-screen justify-center">
          <div className="text-[11px] tracking-[0.1em] text-white/40 font-medium">
            Journal
          </div>
          <div className="text-2xl font-semibold tracking-tight">
            No trades yet
          </div>
          <div className="text-sm text-white/55 max-w-sm text-center">
            Log your first trade to start tracking edge, streaks, and strategy
            performance.
          </div>
          <button
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition cursor-pointer text-sm font-medium"
            onClick={() => {
              setEditingTrade(null);
              setIsModalOpen(true);
            }}
          >
            <i className="fa-solid fa-plus text-[11px]" />
            Add new trade
          </button>
        </div>
      ) : (
        <div className="w-full flex justify-center mt-19 md:mt-[100px]">
          <div
            className={`w-full max-w-[1500px] flex flex-col items-stretch px-5 md:px-10 pb-5 md:pb-10 transition-[padding] duration-300 ease-out ${
              isFiltersOpen ? "md:pl-[300px]" : ""
            }`}
          >
            <Filters
              filter={filter}
              setFilter={setFilter}
              strategy={strategy}
              setStrategy={setStrategy}
              strategies={strategies}
              symbol={symbol}
              setSymbol={setSymbol}
              option={option}
              setOption={setOption}
              symbols={symbols}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              isOpen={isFiltersOpen}
              setIsOpen={setIsFiltersOpen}
            />
            {/* Column controls */}
            <div className="relative flex justify-end mt-5 max-[1130px]:mt-3 mb-3">
              <button
                onClick={() => setIsColumnsOpen((v) => !v)}
                title="Customize columns"
                aria-label="Customize columns"
                aria-expanded={isColumnsOpen}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition cursor-pointer ${
                  isColumnsOpen
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                    : "bg-white/[0.03] text-white/60 border-white/10 hover:bg-white/[0.06] hover:text-white hover:border-white/20"
                }`}
              >
                <i className="fa-solid fa-table-columns text-[13px]" />
              </button>
              <AnimatePresence>
                {isColumnsOpen && (
                  <>
                    <motion.div
                      key="columns-backdrop"
                      className="fixed inset-0 z-40"
                      onClick={() => setIsColumnsOpen(false)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    />
                    <motion.div
                      key="columns-panel"
                      className="absolute right-0 top-full mt-2 z-50 w-72 origin-top-right rounded-xl border border-white/10 bg-[var(--surface)] shadow-[0_20px_80px_var(--shadow)] p-2"
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="text-[11px] tracking-[0.08em] text-white/40 font-medium">
                          Columns
                        </span>
                        <button
                          onClick={resetColumns}
                          className="text-[11px] text-teal-300/80 hover:text-teal-300 transition cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="mt-1 flex flex-col">
                        {columnOrder.map((key, i) => {
                          const visible = !hiddenSet.has(key);
                          const lastVisible =
                            visible && visibleColumns.length <= 1;
                          return (
                            <motion.div
                              key={key}
                              layout
                              transition={{
                                layout: {
                                  duration: 0.22,
                                  ease: [0.16, 1, 0.3, 1],
                                },
                              }}
                              draggable
                              onDragStart={() => {
                                dragKey.current = key;
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverKey(key);
                              }}
                              onDragEnd={() => {
                                dragKey.current = null;
                                setDragOverKey(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragKey.current)
                                  moveColumn(dragKey.current, key);
                                dragKey.current = null;
                                setDragOverKey(null);
                              }}
                              className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors ${
                                dragOverKey === key
                                  ? "bg-white/[0.07]"
                                  : "hover:bg-white/[0.04]"
                              }`}
                            >
                              <i className="fa-solid fa-grip-vertical text-white/25 group-hover:text-white/40 text-[11px]" />
                              <button
                                onClick={() => toggleColumn(key)}
                                disabled={lastVisible}
                                className={`flex items-center gap-2.5 flex-1 text-left ${
                                  lastVisible
                                    ? "cursor-default"
                                    : "cursor-pointer"
                                }`}
                                title={
                                  lastVisible
                                    ? "At least one column must stay visible"
                                    : visible
                                      ? "Hide column"
                                      : "Show column"
                                }
                              >
                                <span
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                                    visible
                                      ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                                      : "border-white/15 text-transparent"
                                  }`}
                                >
                                  <i className="fa-solid fa-check text-[9px]" />
                                </span>
                                <span
                                  className={`text-[13px] ${
                                    visible ? "text-white/85" : "text-white/40"
                                  }`}
                                >
                                  {COLUMN_LABELS[key]}
                                </span>
                              </button>
                              <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                                <button
                                  onClick={() =>
                                    i > 0 && moveColumn(key, columnOrder[i - 1])
                                  }
                                  disabled={i === 0}
                                  aria-label="Move up"
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-25 disabled:cursor-default"
                                >
                                  <i className="fa-solid fa-chevron-up text-[10px]" />
                                </button>
                                <button
                                  onClick={() =>
                                    i < columnOrder.length - 1 &&
                                    moveColumn(key, columnOrder[i + 1])
                                  }
                                  disabled={i === columnOrder.length - 1}
                                  aria-label="Move down"
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-25 disabled:cursor-default"
                                >
                                  <i className="fa-solid fa-chevron-down text-[10px]" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div
              ref={tableWrapRef}
              className="relative w-full max-w-[1500px] rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-x-auto max-[1130px]:mt-0 mt-3 p-2 md:p-3"
            >
              {siriBox && (
                <div
                  className="siri-ring absolute z-10"
                  style={{
                    top: siriBox.top,
                    left: siriBox.left,
                    width: siriBox.width,
                    height: siriBox.height,
                  }}
                  aria-hidden
                />
              )}
              {filteredTrades?.length === 0 ? (
                <div className="text-center text-[13px] text-white/40 py-10">
                  No trades match the current filters.
                </div>
              ) : (
                <>
                  <table className="border-collapse table-auto min-w-full">
                    <thead>
                      <tr>
                        {/* Fixed quick-edit column — sits outside the
                            user-customisable column set so it can't be
                            reordered or hidden. */}
                        <th className="pl-2 md:pl-3 pr-0 py-2 w-7" aria-label="Quick edit" />
                        {selectMode && (
                          <th
                            className="pl-1 pr-1 py-2 w-6 md:w-7"
                            aria-label="Select"
                          />
                        )}
                        {visibleColumns.map((key, ci) => {
                          const isDragging = draggingKey === key;
                          const isDragOver =
                            dragOverKey === key && draggingKey !== key;
                          return (
                            <th
                              key={key}
                              draggable
                              onDragStart={(e) => {
                                dragKey.current = key;
                                setDraggingKey(key);
                                // setData is required for Firefox to
                                // actually start the drag.
                                e.dataTransfer.setData("text/plain", key);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(e) => {
                                if (!dragKey.current) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                if (dragOverKey !== key) setDragOverKey(key);
                              }}
                              onDragLeave={() => {
                                if (dragOverKey === key) setDragOverKey(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragKey.current && dragKey.current !== key) {
                                  moveColumn(dragKey.current, key);
                                }
                                dragKey.current = null;
                                setDragOverKey(null);
                                setDraggingKey(null);
                              }}
                              onDragEnd={() => {
                                dragKey.current = null;
                                setDragOverKey(null);
                                setDraggingKey(null);
                              }}
                              className={`${ci === 0 ? "pl-1 pr-1 md:pr-1.5" : "px-1 md:px-1.5"} py-2 whitespace-nowrap md:text-[11px] text-[10px] text-left tracking-[0.04em] font-medium cursor-grab active:cursor-grabbing select-none transition ${
                                isDragging
                                  ? "bg-white/[0.06] text-white"
                                  : isDragOver
                                    ? "text-white bg-teal-500/10"
                                    : "text-white/40 hover:text-white/70"
                              }`}
                            >
                              {COLUMN_LABELS[key]}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <AnimatePresence
                      mode="wait"
                      initial={false}
                      custom={pageDir}
                    >
                      <motion.tbody
                        key={currentPage}
                        custom={pageDir}
                        variants={{
                          enter: (dir: number) => ({
                            opacity: 0,
                            x: dir > 0 ? 24 : -24,
                          }),
                          center: { opacity: 1, x: 0 },
                          exit: (dir: number) => ({
                            opacity: 0,
                            x: dir > 0 ? -24 : 24,
                          }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        {currentTrades?.map((trade, index) => {
                          const tradeId = trade._id ?? "";
                          const isSelected = selectedIds.has(tradeId);
                          // Seed = the first-selected trade. Every
                          // subsequent selection must match it, so
                          // grey out any row that would be an invalid
                          // merge partner rather than fail server-side.
                          const seedId = selectedIds.values().next().value as
                            | string
                            | undefined;
                          const seed =
                            seedId && seedId !== tradeId
                              ? currentTrades.find((t) => t._id === seedId) ??
                                (filteredTrades?.find((t) => t._id === seedId) ??
                                  null)
                              : null;
                          const dimmed =
                            selectMode &&
                            !!seed &&
                            !isSelected &&
                            !isMergeableWithSeed(seed, trade);
                          return (
                          <tr
                            key={index}
                            data-trade-id={tradeId}
                            className={`group text-xs md:text-[13.5px] border-t border-white/[0.06] transition cursor-pointer ${
                              isSelected
                                ? "bg-teal-500/[0.08] hover:bg-teal-500/[0.12]"
                                : dimmed
                                  ? "opacity-40 hover:bg-white/[0.02]"
                                  : "hover:bg-white/[0.02]"
                            }`}
                            onClick={() => {
                              if (selectMode) {
                                if (!tradeId) return;
                                if (dimmed) return;
                                toggleSelected(tradeId);
                                return;
                              }
                              router.push(`/trades/${userId}/${trade._id}`);
                            }}
                          >
                            {/* Pencil icon — quick-edit modal. Stops
                                propagation so the row's row-click
                                navigation doesn't fire. */}
                            <td className="pl-2 md:pl-3 pr-0 py-1 w-7 align-middle">
                              <button
                                type="button"
                                aria-label="Quick edit"
                                title="Quick edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTrade(trade);
                                  setIsModalOpen(true);
                                }}
                                className="w-7 h-7 rounded-md inline-flex items-center justify-center text-white/35 group-hover:text-white/65 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
                              >
                                <i className="fa-solid fa-pen text-[11px]" />
                              </button>
                            </td>
                            {selectMode && (
                              <td className="pl-1 pr-1 py-1 w-6 md:w-7 align-middle">
                                <input
                                  type="checkbox"
                                  aria-label="Select trade"
                                  checked={isSelected}
                                  disabled={dimmed}
                                  onChange={() => {
                                    if (!tradeId) return;
                                    toggleSelected(tradeId);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 accent-teal-400 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                            )}
                            {visibleColumns.map((key, ci) => (
                              <td
                                key={key}
                                className={`${ci === 0 ? "pl-1 pr-1 md:pr-1.5" : "px-1 md:px-1.5"} py-1 whitespace-nowrap transition ${
                                  key === "notes" ? "text-center" : ""
                                } ${
                                  draggingKey === key
                                    ? "bg-white/[0.06]"
                                    : dragOverKey === key && draggingKey !== null
                                      ? "bg-teal-500/[0.06]"
                                      : ""
                                }`}
                              >
                                {renderCell(key, trade)}
                              </td>
                            ))}
                          </tr>
                          );
                        })}
                      </motion.tbody>
                    </AnimatePresence>
                  </table>
                </>
              )}
            </div>
            {filteredTrades?.length !== 0 && (
              <div className="flex md:justify-between gap-2 mt-5 w-full max-w-[1500px]">
                <div className="flex gap-2">
                  <button
                    className="inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition cursor-pointer text-[12px] md:text-[13px] font-medium w-9 h-9 md:w-auto md:h-auto"
                    onClick={() => {
                      setEditingTrade(null);
                      setIsModalOpen(true);
                    }}
                  >
                    <i className="fa-solid fa-plus text-[11px]" />
                    <span className="md:inline hidden">Add trade</span>
                  </button>
                  <button
                    className={`inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 transition text-[12px] md:text-[13px] font-medium w-9 h-9 md:w-auto md:h-auto ${
                      syncing
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-indigo-500/25"
                    }`}
                    onClick={handleSync}
                    disabled={syncing}
                    title="Import any new trades from IBKR"
                  >
                    <i
                      className={`fa-solid fa-rotate text-[11px] ${
                        syncing ? "animate-spin" : ""
                      }`}
                    />
                    <span className="md:inline hidden">
                      {syncing ? "Syncing…" : "Sync IBKR"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImported(true)}
                    disabled={syncing}
                    title="See what the last sync imported"
                    aria-label="View last imported trades"
                    className="inline-flex items-center justify-center gap-2 px-3 md:px-3 py-2 rounded-full bg-white/[0.03] text-white/60 border border-white/10 hover:bg-white/[0.06] hover:text-white transition cursor-pointer text-[12px] md:text-[13px] font-medium w-9 h-9"
                  >
                    <i className="fa-solid fa-list-check text-[11px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectMode) exitSelectMode();
                      else setSelectMode(true);
                    }}
                    title={
                      selectMode
                        ? "Exit selection mode"
                        : "Select trades to merge partial fills into one"
                    }
                    aria-label="Select trades to merge"
                    className={`inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-full border transition text-[12px] md:text-[13px] font-medium w-9 h-9 md:w-auto md:h-auto cursor-pointer ${
                      selectMode
                        ? "bg-teal-500/25 text-teal-200 border-teal-500/40 hover:bg-teal-500/30"
                        : "bg-white/[0.03] text-white/60 border-white/10 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <i className="fa-solid fa-object-group text-[11px]" />
                    <span className="md:inline hidden">
                      {selectMode ? "Cancel merge" : "Merge trades"}
                    </span>
                  </button>
                </div>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-5">
                <button
                  aria-label="First page"
                  className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-default flex items-center justify-center"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(1)}
                >
                  <i className="fa-solid fa-angles-left text-[11px]" />
                </button>
                <button
                  aria-label="Previous page"
                  className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-default flex items-center justify-center"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <i className="fa-solid fa-chevron-left text-[11px]" />
                </button>

                <span className="px-3 text-[12px] text-white/55 tabular-nums">
                  {currentPage} / {totalPages}
                </span>

                <button
                  aria-label="Next page"
                  className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-default flex items-center justify-center"
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  <i className="fa-solid fa-chevron-right text-[11px]" />
                </button>
                <button
                  aria-label="Last page"
                  className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-default flex items-center justify-center"
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(totalPages)}
                >
                  <i className="fa-solid fa-angles-right text-[11px]" />
                </button>
              </div>
            )}

            {filteredTrades?.length !== 0 && (
              <Statistics
                data={trades!}
                status={filter}
                filteredData={filteredTrades!}
                option={option}
                strategy={strategy}
                symbol={symbol}
              />
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <TradeModal
          date={
            editingTrade?.dateBought ? new Date(editingTrade.dateBought) : today
          }
          onClose={() => {
            setIsModalOpen(false);
            setEditingTrade(null);
          }}
          onSave={(e) =>
            handleSaveTrade(
              e,
              userId,
              setIsModalOpen,
              queryClient,
              setEditingTrade,
            )
          }
          initialTrade={editingTrade ?? undefined}
          onDelete={() =>
            handleDeleteTrade(
              editingTrade?._id,
              userId,
              setIsModalOpen,
              setEditingTrade,
              queryClient,
            )
          }
        />
      )}
      {isNotesOpen && (
        <NotesModal
          notes={notes}
          onClose={() => setIsNotesOpen(false)}
          onSave={(e) =>
            handleSaveNotes(e, editingTrade?._id, userId, queryClient)
          }
          tradeId={editingTrade?._id}
        />
      )}
      {/* Undo pill after a successful merge. Auto-dismisses after 20s
          (see effect above) or when the user clicks × / Undo. */}
      {lastMerge && !selectMode && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+100px)] md:bottom-8 z-[55] pointer-events-auto flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-full bg-[var(--surface,#141419)]/95 border border-white/15 shadow-[0_20px_60px_var(--shadow,rgba(0,0,0,0.6))] backdrop-blur-md">
          <span className="text-[12.5px] md:text-[13px] text-white/75 font-medium">
            Merged {lastMerge.count} trades
          </span>
          <div className="w-px h-4 bg-white/15" />
          <button
            type="button"
            onClick={handleUndoMerge}
            disabled={undoing}
            className="inline-flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 rounded-full bg-white/[0.06] text-white border border-white/15 hover:bg-white/[0.12] transition text-[12.5px] md:text-[13px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {undoing ? (
              <>
                <i className="fa-solid fa-spinner animate-spin text-[10px]" />
                Undoing…
              </>
            ) : (
              <>
                <i className="fa-solid fa-rotate-left text-[10px]" />
                Undo
              </>
            )}
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setLastMerge(null)}
            disabled={undoing}
            className="w-6 h-6 rounded-full inline-flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.08] transition cursor-pointer disabled:opacity-40"
          >
            <i className="fa-solid fa-xmark text-[10px]" />
          </button>
        </div>
      )}

      {/* Floating merge action bar + inline confirm popover */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+100px)] md:bottom-8 z-[55] flex flex-col items-center gap-2 pointer-events-none">
          {mergeConfirmOpen && (
            <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--surface,#141419)]/95 border border-white/15 shadow-[0_12px_40px_var(--shadow,rgba(0,0,0,0.5))] backdrop-blur-md">
              <span className="text-[12.5px] text-white/80 font-medium">
                Merge {selectedIds.size}?
              </span>
              <button
                type="button"
                onClick={() => setMergeConfirmOpen(false)}
                disabled={merging}
                className="px-2.5 py-1 rounded-full text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] transition cursor-pointer disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleMergeConfirm}
                disabled={merging}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/25 text-teal-200 border border-teal-500/40 hover:bg-teal-500/35 transition text-[12px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {merging && (
                  <i className="fa-solid fa-spinner animate-spin text-[10px]" />
                )}
                Yes
              </button>
            </div>
          )}
          <div className="pointer-events-auto flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-full bg-[var(--surface,#141419)]/95 border border-white/15 shadow-[0_20px_60px_var(--shadow,rgba(0,0,0,0.6))] backdrop-blur-md">
            <button
              type="button"
              onClick={clearSelection}
              disabled={merging}
              className="shrink-0 whitespace-nowrap text-[12px] md:text-[12.5px] text-white/50 hover:text-white transition cursor-pointer disabled:opacity-40"
            >
              Clear
            </button>
            <div className="w-px h-4 bg-white/15" />
            <button
              type="button"
              disabled={selectedIds.size < 2 || merging}
              onClick={() => setMergeConfirmOpen((v) => !v)}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 rounded-full bg-teal-500/25 text-teal-200 border border-teal-500/40 hover:bg-teal-500/35 transition text-[12.5px] md:text-[13px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-object-group text-[11px]" />
              Merge {selectedIds.size}
            </button>
          </div>
        </div>
      )}

      {showImported && (
        <ImportedTradesModal
          onClose={() => setShowImported(false)}
          onDeleted={() => {
            // Refresh the trades table after a row gets deleted from
            // the modal so the table reflects the change.
            queryClient.invalidateQueries({ queryKey: ["trades", userId] });
          }}
        />
      )}
    </>
  );
}

export default withAuth(Page);
