"use client";

import { Trade } from "@/app/types/Trades";
import { format } from "date-fns";
import React, { useEffect } from "react";

type TradeModalProps = {
  onClose: () => void;
  initialTrade: Partial<Trade>;
  onEdit: () => void;
};

export default function ViewTradeModal({
  onClose,
  initialTrade,
  onEdit,
}: TradeModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="relative flex flex-col bg-[#0F0F17] p-6 rounded-xl w-[90%] max-w-md text-white">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <div>
              <div
                className={`font-extrabold text-end ${
                  initialTrade.option === "CALL"
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {initialTrade.option}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <div>Trade Details</div>
                <div className="bg-white/3 p-4 rounded-md">
                  <div className="flex gap-2">
                    <div>Symbol:</div>
                    <div>
                      {initialTrade.symbol} x {initialTrade.qty}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div>Contract Price:</div>
                    <div>{initialTrade.contractPrice}</div>
                  </div>
                  <div className="flex gap-2">
                    <div>Strike:</div>
                    <div>{initialTrade.strike}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div>Dates</div>
                <div className="bg-white/3 p-4 rounded-md">
                  <div className="flex gap-2">
                    <div>Bought:</div>
                    <div>
                      {format(
                        new Date(initialTrade.dateBought ?? ""),
                        "dd/MM/yy"
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div>Expiry:</div>
                    <div>
                      {format(
                        new Date(initialTrade.expiryDate ?? ""),
                        "dd/MM/yy"
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div>Sold:</div>
                    <div>
                      {format(
                        new Date(initialTrade.dateClosed ?? ""),
                        "dd/MM/yy"
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div>Closing and P/L</div>
                <div className="bg-white/3 p-4 rounded-md">
                  <div className="flex gap-2">
                    <div>Contract closed at:</div>
                    <div>{initialTrade.closingContractPrice}</div>
                  </div>
                  <div className="flex gap-2">
                    <div>{initialTrade.strategy}</div>
                  </div>
                  <div className="flex gap-2">
                    <div>
                      {Number(initialTrade.profitLoss) > 0 ? (
                        <div className="text-green-500">
                          Profit: ${initialTrade.profitLoss?.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-red-500">
                          Loss: ${initialTrade.profitLoss?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#16151C] transition duration-200 ease-in-out rounded hover:bg-[#16151C]/70 cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 transition duration-200 ease-in-out rounded hover:bg-blue-700 cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
