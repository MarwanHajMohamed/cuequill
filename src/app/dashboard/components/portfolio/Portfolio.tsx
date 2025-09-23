"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import TransactionModal from "./TransactionModal";
import { usePortfolioHistory } from "@/hooks/usePortfolioHistory";

export default function PortfolioChart({ userId }: { userId: string }) {
  const { data: chartData, loading } = usePortfolioHistory(userId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAW" | null>(null);

  if (loading) return <div>Loading balance history...</div>;

  return (
    <>
      <div className="mb-20">
        <div>
          <div className="text-white flex gap-2 justify-center items-center">
            <div className="text-3xl">
              ${chartData[chartData.length - 1]?.balance ?? 0}
            </div>
          </div>
          <div className="flex gap-4 w-full items-center justify-center mb-5 mt-2">
            <button
              className="border border-[#4747A1] px-5 py-1 rounded-2xl bg-[#4747A1]/20 
          cursor-pointer transition duration-100 hover:bg-[#4747A1]/50"
              onClick={() => {
                setType("DEPOSIT");
                setIsModalOpen(true);
              }}
            >
              Deposit
            </button>
            <button
              className="border border-[#4747A1] px-5 py-1 rounded-2xl bg-[#4747A1]/20 
          cursor-pointer transition duration-100 hover:bg-[#4747A1]/50"
              onClick={() => {
                setType("WITHDRAW");
                setIsModalOpen(true);
              }}
            >
              Withdraw
            </button>
          </div>
        </div>
        <div className="max-w-[1000px] w-[90vw]">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis
                dataKey="balance"
                domain={[
                  (dataMin: number) => Math.floor(dataMin / 10) * 10 - 10,
                  (dataMax: number) => Math.ceil(dataMax / 10) * 10 + 10,
                ]}
              />
              <Tooltip />
              <Line
                type="linear"
                dataKey="balance"
                stroke="#4747A1"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {isModalOpen && (
        <TransactionModal
          userId={userId}
          type={type}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
