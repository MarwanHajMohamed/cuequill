"use client";

import TradeModal from "@/app/dashboard/components/lists/TradeModal";
import { Trade } from "@/app/types/Trades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { withAuth } from "@/lib/withAuth";
import { useQueryClient } from "@tanstack/react-query";
import React, { use, useState } from "react";
import NotesModal from "../NotesModal";
import { useToast } from "@/hooks/useToast";

function Page({ params }: { params: Promise<{ userId: string }> }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const toast = useToast();

  const { userId } = use(params);
  const { data: trades, isLoading, isError } = useTrades(userId, simulated);

  const today = new Date();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const [delAllModal, setDelAllModal] = useState<boolean>(false);

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

  const handleSaveTrade = async (trade: Trade) => {
    if (trade._id) {
      // UPDATE EXISTING TRADE
      await fetch(`/api/trades/${trade._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
    } else {
      // CREATE NEW TRADE
      await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trade, userId }),
      });
    }

    await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
    setIsModalOpen(false);
    setEditingTrade(null);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    try {
      await fetch(`/api/trades/${tradeId}`, {
        method: "DELETE",
      });

      await queryClient.invalidateQueries({ queryKey: ["trades", userId] });

      setIsModalOpen(false);
      setEditingTrade(null);
    } catch (err) {
      console.error("Failed to delete trade", err);
    }
  };

  const handleDeleteAllTrades = async () => {
    try {
      const res = await fetch(`/api/trades`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, simulated }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete trades");
      }

      const result = await res.json();

      toast(result.message);
      queryClient.invalidateQueries({ queryKey: ["trades", userId] });
    } catch (err) {
      console.error("Error deleting trades:", err);
    }
  };

  const handleSaveNotes = async (newNotes: string, tradeId: string) => {
    await fetch(`/api/trades/${tradeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: newNotes }),
    });

    await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
  };

  if (!trades || trades.length === 0)
    return (
      <>
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
        {isModalOpen && (
          <TradeModal
            date={
              editingTrade?.dateBought
                ? new Date(editingTrade.dateBought)
                : today
            }
            onClose={() => {
              setIsModalOpen(false);
              setEditingTrade(null);
            }}
            onSave={handleSaveTrade}
            initialTrade={editingTrade ?? undefined}
            onDelete={handleDeleteTrade}
          />
        )}
      </>
    );

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

  return (
    <>
      <div className="p-10 mt-20 w-full flex flex-col items-center">
        <div className="w-full max-w-[1500px] overflow-x-auto">
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
                      trade.option.slice(1, trade.option.length).toLowerCase()}
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
                      trade.status.slice(1, trade.status.length).toLowerCase()}
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
                    {new Date(trade.dateBought).toLocaleDateString("en-GB")}
                  </td>
                  <td className={`px-4 py-1 whitespace-nowrap w-full`}>
                    {new Date(trade.expiryDate).toLocaleDateString("en-GB")}
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
                    <i
                      className="fa-solid fa-book cursor-pointer text-white/50 transition duration-100 hover:text-white/100 text-lg"
                      onClick={() => {
                        setIsNotesOpen(true);
                        setEditingTrade(trade);
                        setNotes(trade.notes || "");
                      }}
                    ></i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-5">
            <button
              className="text-xs border border-red-500 bg-red-500/20 p-2 rounded-lg flex gap-2 items-center cursor-pointer
            transition duration-100 hover:bg-red-500/50"
              onClick={() => setDelAllModal(true)}
            >
              <i className="fa-solid fa-trash-can"></i>
              Delete all trades
            </button>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <TradeModal
          date={
            editingTrade?.dateBought ? new Date(editingTrade.dateBought) : today
          }
          onClose={() => {
            setIsModalOpen(false);
            setEditingTrade(null);
          }}
          onSave={handleSaveTrade}
          initialTrade={editingTrade ?? undefined}
          onDelete={handleDeleteTrade}
        />
      )}
      {isNotesOpen && (
        <NotesModal
          notes={notes}
          onClose={() => setIsNotesOpen(false)}
          onSave={handleSaveNotes}
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
                onClick={handleDeleteAllTrades}
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
