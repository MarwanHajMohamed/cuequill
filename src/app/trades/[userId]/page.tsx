"use client";

import TradeModal from "@/app/dashboard/components/modals/EditTradeModal";
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

function Page({ params }: { params: Promise<{ userId: string }> }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const toast = useToast();
  const today = new Date();
  const queryClient = useQueryClient();

  const { userId } = use(params);
  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [delAllModal, setDelAllModal] = useState<boolean>(false);

  const [notes, setNotes] = useState<string>("");
  const [strategy, setStrategy] = useState<StrategyList>("All");
  const [symbol, setSymbol] = useState<string>("All");
  const [filter, setFilter] = useState<"All" | "Win" | "Loss">("All");
  const [option, setOption] = useState<"All" | "CALL" | "PUT">("All");

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

  if (isLoading)
    return (
      <div className="flex flex-col gap-2 items-center h-screen justify-center">
        Loading trades...
      </div>
    );
  if (isError)
    return (
      <div className="text-red-500 lex flex-col gap-2 items-center h-screen justify-center">
        Error loading trades
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
    "",
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

      return true;
    });

  return (
    <>
      {!trades || trades.length === 0 ? (
        <div className="flex flex-col gap-2 items-center h-screen justify-center">
          <div className="text-gray-400">No trades found.</div>
          <button
            className="cursor-pointer bg-blue-600 p-2 rounded-lg transition duration-100 hover:bg-blue-700"
            onClick={() => {
              setEditingTrade(null);
              setIsModalOpen(true);
            }}
          >
            Add new trade
          </button>
        </div>
      ) : (
        <div className="p-10 pt-5 mt-0 w-full flex flex-col items-center">
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
          />
          <div className="w-full max-w-[1500px] overflow-x-auto mt-5">
            {filteredTrades?.length === 0 ? (
              <div className="text-center">No trades found</div>
            ) : (
              <>
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
                    {filteredTrades?.map((trade, index) => (
                      <tr key={index}>
                        <td>
                          <i
                            className="fa-solid fa-pen-to-square cursor-pointer text-white/30 transition duration-100 hover:text-white/100 text-lg"
                            onClick={() => {
                              setEditingTrade(trade);
                              setIsModalOpen(true);
                            }}
                          ></i>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap w-full">
                          {trade.symbol}
                        </td>
                        <td
                          className={`px-4 py-1 whitespace-nowrap w-full ${
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
                          className={`px-4 py-1 whitespace-nowrap w-full ${
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
                        <td className={`px-4 py-1 whitespace-nowrap w-full`}>
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
                          {trade.contractPrice}
                        </td>
                        <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                          {trade.qty}
                        </td>
                        <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                          {trade.strike}
                        </td>
                        <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                          {new Date(trade.dateBought).toLocaleDateString(
                            "en-GB"
                          )}
                        </td>
                        <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                          {new Date(trade.expiryDate).toLocaleDateString(
                            "en-GB"
                          )}
                        </td>
                        <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                          {trade.closingContractPrice === null
                            ? "-"
                            : trade.closingContractPrice}
                        </td>
                        <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                          {trade.strategy}
                        </td>
                        <td
                          className={`px-4 py-1 whitespace-nowrap w-full text-center`}
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
                  </tbody>
                </table>

                <div className="flex justify-end mt-5">
                  <button
                    className="text-xs border border-red-500 bg-red-500/20 p-2 rounded-lg 
                      flex gap-2 items-center cursor-pointer
                      transition duration-100 hover:bg-red-500/50"
                    onClick={() => setDelAllModal(true)}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    Delete all trades
                  </button>
                </div>

                <Statistics
                  data={trades!}
                  status={filter}
                  filteredData={filteredTrades!}
                  option={option}
                  symbol={symbol}
                  strategy={strategy}
                />
              </>
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
              setEditingTrade
            )
          }
          initialTrade={editingTrade ?? undefined}
          onDelete={() =>
            handleDeleteTrade(
              editingTrade?._id,
              userId,
              setIsModalOpen,
              setEditingTrade,
              queryClient
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-51">
          <div className="flex flex-col gap-4 bg-[#0F0F17] items-center p-6 rounded-xl w-[90%] max-w-lg text-white text-center">
            <div>
              Are you sure you want to delete all trades? This action is
              irreversible.
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
                onClick={() => setDelAllModal(false)}
              >
                No
              </button>
              <button
                className="px-4 py-2 bg-[#16151C] transition duration-200 ease-in-out rounded hover:bg-gray-700 cursor-pointer"
                onClick={() =>
                  handleDeleteAllTrades(
                    userId,
                    simulated,
                    setDelAllModal,
                    toast,
                    queryClient
                  )
                }
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default withAuth(Page);
