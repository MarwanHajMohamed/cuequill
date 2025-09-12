"use client";

import { useToast } from "@/hooks/useToast";
import { format } from "date-fns";
import React, { useState } from "react";

type Props = {
  type: "DEPOSIT" | "WITHDRAW" | null;
  userId: string;
  onClose: () => void;
};

export default function TransactionModal({ type, userId, onClose }: Props) {
  const [amount, setAmount] = useState<number | null>(null);
  const today = new Date();
  const [dateOfTransfer, setDateOfTransfer] = useState<string>(
    format(today, "yyyy-MM-dd")
  );
  const [loading, setLoading] = useState(false);

  const toast = useToast();

  const handleSave = async () => {
    if (!amount || !type) return alert("Please enter a valid amount");

    setLoading(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type,
          amount,
          date: dateOfTransfer,
        }),
      });

      if (!res.ok) throw new Error("Failed to save transaction");
      toast("Deposit successfull!");

      onClose();
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F17] p-6 w-[90%] max-w-lg flex flex-col gap-4 rounded-xl">
        <div className="flex flex-col gap-1 w-full">
          <div>Amount to {type?.toLowerCase()}:</div>
          <input
            type="number"
            value={amount === null ? "" : amount}
            className="w-full p-2 text-white bg-[#1A1A1D] rounded"
            onChange={(e) =>
              setAmount(e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <div>Date of transfer:</div>
          <input
            type="date"
            value={dateOfTransfer}
            className="w-full p-2 text-white bg-[#1A1A1D] rounded"
            onChange={(e) => setDateOfTransfer(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#16151C] transition duration-200 ease-in-out rounded hover:bg-gray-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
          >
            {loading ? "Processing..." : type}
          </button>
        </div>
      </div>
    </div>
  );
}
