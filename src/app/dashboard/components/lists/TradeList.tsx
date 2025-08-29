"use client";

import { useTrades } from "@/hooks/useTrades";
import React, { useState } from "react";
import TradeModal from "./TradeModal";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export default function TradeList({ userId }: { userId: string }) {
  const { data: trades, isLoading, isError } = useTrades(userId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any | null>(null);

  const today = new Date();
  const router = useRouter();
  const queryClient = useQueryClient();

  if (isLoading)
    return (
      <div className="text-[#5B5B5B] p-6 space-y-4 w-[100%] max-w-150">
        <h2 className="font-semibold text-white">Trades:</h2>
        <ul className="bg-[#16151C] border border-white/10 rounded-lg p-4 min-h-44">
          <li>Loading trades...</li>
        </ul>
      </div>
    );
  if (isError)
    return (
      <div className="text-red-500 p-6 space-y-4 w-[100%] max-w-150">
        <h2 className="font-semibold text-white">Trades:</h2>
        <ul className="bg-[#16151C] border border-white/10 rounded-lg p-4 min-h-44">
          <li>Error loading trades</li>
        </ul>
      </div>
    );

  const handleSaveTrade = async (trade: any) => {
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

  return (
    <>
      <div className="text-white p-6 space-y-4 w-[100%] max-w-150">
        <h2 className="font-semibold">Trades:</h2>
        <ul className="bg-[#16151C] border border-white/10 rounded-lg pl-4 min-h-44">
          {!trades || trades.length === 0 ? (
            <li className="text-[#5B5B5B] py-4">No trades found</li>
          ) : (
            [...trades]
              .sort(
                (a, b) =>
                  new Date(a.expiryDate).getTime() -
                  new Date(b.expiryDate).getTime()
              )
              .slice(0, 3)
              .map((trade) => (
                <li
                  key={trade._id}
                  className="p-3 pl-0 border-b border-white/10 last:border-0 cursor-pointer"
                  onClick={() => {
                    setEditingTrade(trade);
                    setIsModalOpen(true);
                    console.log(trade.expiryDate);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="uppercase text-sm">
                      {trade.symbol} <span className="lowercase">x</span>{" "}
                      {trade.qty}
                    </div>
                    <div
                      className={`text-sm ${
                        trade.status === "OPEN"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {trade.status === "OPEN" ? trade.status : "CLOSED"}
                    </div>
                  </div>
                </li>
              ))
          )}
          <li className="p-2 pr-3 flex justify-end">
            <div
              className="bg-white/10 w-6 text-center rounded-full cursor-pointer"
              onClick={() => {
                setEditingTrade(null);
                setIsModalOpen(true);
              }}
            >
              +
            </div>
          </li>
        </ul>
        {trades?.length === 0 ? (
          ""
        ) : (
          <div className="flex justify-end">
            <button
              className="bg-blue-800 py-2 px-4 rounded-md cursor-pointer ease-in-out transition duration-100 hover:bg-blue-700"
              onClick={() => router.push(`/trades/${userId}`)}
            >
              See all
            </button>
          </div>
        )}
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
    </>
  );
}
