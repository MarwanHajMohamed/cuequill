"use client";

import { useTrades } from "@/hooks/useTrades";
import React, { useState } from "react";
import TradeModal from "../modals/TradeModal";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Trade } from "@/app/types/Trades";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function TradeList({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading, isError } = useTrades(userId, simulated);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

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

  return (
    <>
      <div className="text-white p-6 space-y-4 w-[100%] max-w-150">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold md:text-base text-sm">Trades</h2>
          <div
            className="bg-white/10 w-6 text-center rounded-full cursor-pointer"
            onClick={() => {
              setEditingTrade(null);
              setIsModalOpen(true);
            }}
          >
            +
          </div>
        </div>
        <ul className="bg-[#16151C] border border-white/10 rounded-lg pl-4 min-h-44">
          {!trades || trades.length === 0 ? (
            <li className="text-[#5B5B5B] py-4 text-sm md:text-base">
              No trades found
            </li>
          ) : (
            [...trades]
              .sort(
                (a, b) =>
                  new Date(b.dateBought).getTime() -
                  new Date(a.dateBought).getTime()
              )
              .slice(0, 4)
              .map((trade) => (
                <li
                  key={trade._id}
                  className="p-3 pl-0 border-b border-white/10 last:border-0 cursor-pointer"
                  onClick={() => {
                    setEditingTrade(trade);
                    setIsModalOpen(true);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="uppercase md:text-sm text-xs">
                      {trade.symbol} <span className="lowercase">x</span>{" "}
                      {trade.qty}
                    </div>
                    <div
                      className={`md:text-sm text-xs ${
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
        </ul>
        <div className="flex justify-end">
          <button
            className="bg-blue-600 py-2 px-4 rounded-md cursor-pointer ease-in-out transition duration-100 hover:bg-blue-700 text-xs md:text-base"
            onClick={() => router.push(`/trades/${userId}`)}
          >
            See all
          </button>
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
    </>
  );
}
