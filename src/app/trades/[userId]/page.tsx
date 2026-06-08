"use client";

import TradeModal from "@/app/dashboard/components/modals/TradeModal";
import { StrategyList, Trade } from "@/app/types/Trades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { withAuth } from "@/lib/withAuth";
import { useQueryClient } from "@tanstack/react-query";
import React, { use, useEffect, useState } from "react";
import NotesModal from "../NotesModal";
import { useToast } from "@/hooks/useToast";
import {
  handleDeleteAllTrades,
  handleDeleteTrade,
  handleSaveNotes,
  handleSaveTrade,
} from "../../../handlers/tradeHandlers";
import Filters from "./Filters";
import Statistics from "./Statistics";
import { AnimatePresence, motion } from "framer-motion";
import { HeroSkeleton, TableSkeleton } from "@/components/Loaders";

function Page({ params }: { params: Promise<{ userId: string }> }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const toast = useToast();
  const today = new Date();
  const queryClient = useQueryClient();
  const { userId } = use(params);
  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  // USE STATES
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [delAllModal, setDelAllModal] = useState<boolean>(false);
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
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const tradesPerPage = 15;

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
          `Already up to date — no new trades${skipped ? ` (${skipped} skipped)` : ""}`,
        );
      } else {
        toast(
          `Imported ${inserted} new trade${inserted === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped)` : ""}`,
        );
        await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
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
        setDelAllModal(false);
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
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/40 font-medium">
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

  const headings = [
    "Symbol",
    "PUT/CALL",
    "Status",
    "P/L",
    "Change %",
    "Contract Price",
    "Qty",
    "Strike",
    "Date Bought",
    "Expiry Date",
    "Closing Contract Price",
    "Strategy",
    "Notes",
  ];

  const calcChange = (newPrice: number, oldPrice: number) => {
    return (((newPrice - oldPrice) / oldPrice) * 100).toFixed(0);
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
      // and ENTRY date for open ones — same convention used by the
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
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
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
            {/* Hero */}
            <div className="flex flex-col gap-2 mb-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
                Journal
              </div>
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
                  <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                    Trades
                  </span>
                </h1>
                <div className="text-[12px] text-white/45 tabular-nums">
                  {filteredTrades?.length ?? 0} of {trades.length}
                </div>
              </div>
            </div>
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
            <div className="w-full max-w-[1500px] rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-x-auto max-[1130px]:mt-0 mt-5 p-2 md:p-3">
              {filteredTrades?.length === 0 ? (
                <div className="text-center text-[13px] text-white/40 py-10">
                  No trades match the current filters.
                </div>
              ) : (
                <>
                  <table className="border-collapse table-auto min-w-full">
                    <thead>
                      <tr>
                        {headings.map((h) => (
                          <th
                            key={h}
                            className="px-2 md:px-4 py-2 whitespace-nowrap w-full text-white/40 md:text-[11px] text-[10px] text-left uppercase tracking-[0.12em] font-medium"
                          >
                            {h}
                          </th>
                        ))}
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
                        {currentTrades?.map((trade, index) => (
                          <tr
                            key={index}
                            className="text-xs md:text-[13.5px] border-t border-white/[0.06] hover:bg-white/[0.02] transition cursor-pointer"
                            onClick={() => {
                              setEditingTrade(trade);
                              setIsModalOpen(true);
                            }}
                          >
                            <td className="px-2 md:px-4 py-1 whitespace-nowrap w-full">
                              {trade.symbol}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full ${
                                trade.option === "CALL"
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {trade.option.slice(0, 1) +
                                trade.option
                                  .slice(1, trade.option.length)
                                  .toLowerCase()}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full ${
                                trade.status === "OPEN"
                                  ? "text-blue-500"
                                  : trade.status === "WIN"
                                    ? "text-green-500"
                                    : "text-red-500"
                              }`}
                            >
                              {trade.status.slice(0, 1) +
                                trade.status
                                  .slice(1, trade.status.length)
                                  .toLowerCase()}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {trade.status === "OPEN" ? (
                                "-"
                              ) : (
                                <span
                                  className={
                                    trade.status === "WIN"
                                      ? "text-green-500"
                                      : "text-red-500"
                                  }
                                >
                                  ${trade.profitLoss?.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {trade.status === "OPEN" ? (
                                "-"
                              ) : (
                                <span
                                  className={
                                    Number(
                                      calcChange(
                                        Number(trade.closingContractPrice),
                                        Number(trade.contractPrice),
                                      ),
                                    ) > 0
                                      ? "text-green-500"
                                      : "text-red-500"
                                  }
                                >
                                  {calcChange(
                                    Number(trade.closingContractPrice),
                                    Number(trade.contractPrice),
                                  )}
                                  %
                                </span>
                              )}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {trade.contractPrice}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {trade.qty}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {trade.strike}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {new Date(trade.dateBought).toLocaleDateString(
                                "en-GB",
                              )}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {new Date(trade.expiryDate).toLocaleDateString(
                                "en-GB",
                              )}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {trade.closingContractPrice === null
                                ? "-"
                                : trade.closingContractPrice}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full`}
                            >
                              {trade.strategy}
                            </td>
                            <td
                              className={`px-2 md:px-4 py-1 whitespace-nowrap w-full text-center`}
                            >
                              {trade.notes !== "" ? (
                                <i
                                  className="fa-solid fa-book-open cursor-pointer text-white/70 transition duration-100 hover:text-white/100 text-lg"
                                  onClick={() => {
                                    setIsNotesOpen(true);
                                    setEditingTrade(trade);
                                    setNotes(trade.notes || "");
                                  }}
                                ></i>
                              ) : (
                                <i
                                  className="fa-solid fa-book cursor-pointer text-white/20 transition duration-100 hover:text-white/100 text-lg"
                                  onClick={() => {
                                    setIsNotesOpen(true);
                                    setEditingTrade(trade);
                                    setNotes(trade.notes || "");
                                  }}
                                ></i>
                              )}
                            </td>
                          </tr>
                        ))}
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
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-full bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20 transition cursor-pointer text-[12px] md:text-[13px] font-medium w-9 h-9 md:w-auto md:h-auto"
                  onClick={() => setDelAllModal(true)}
                >
                  <i className="fa-solid fa-trash-can text-[11px]" />
                  <span className="md:inline hidden">Delete all</span>
                </button>
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
      {delAllModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-51 p-4">
          <div className="flex flex-col gap-5 bg-[#0F0F17] border border-white/10 items-center p-6 md:p-7 rounded-2xl w-full max-w-md text-white text-center shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <i className="fa-solid fa-triangle-exclamation text-red-300 text-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">Delete all trades?</div>
              <div className="text-[13px] text-white/55 leading-relaxed">
                This permanently removes every trade in this journal. The action
                can&apos;t be undone.
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition cursor-pointer text-[13px]"
                onClick={() => setDelAllModal(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition cursor-pointer text-[13px] font-medium"
                onClick={() =>
                  handleDeleteAllTrades(
                    userId,
                    simulated,
                    setDelAllModal,
                    toast,
                    queryClient,
                  )
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default withAuth(Page);
