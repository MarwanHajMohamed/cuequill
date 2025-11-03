"use client";

import React, { useEffect, useState } from "react";
import { Goal } from "../types/Goal";
import { fetchProfit } from "./helpers";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSession } from "next-auth/react";

export default function Statistics({ goals }: { goals: Goal[] }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades } = useTrades(userId, simulated);

  const [hideBalance, setHideBalance] = useState<boolean>(true);
  const [profitLoss, setProfitLoss] = useState<number>();

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    if (userId) {
      fetchProfit(lastMonth, lastMonthYear, userId, simulated).then((profit) =>
        setProfitLoss(profit)
      );
    }
  }, [userId, simulated]);

  const monthsTrades = trades?.filter((trade) => {
    const tradeDate = new Date(trade.dateBought);
    const now = new Date();

    return (
      tradeDate.getMonth() === now.getMonth() - 1 &&
      tradeDate.getFullYear() === now.getFullYear()
    );
  });

  return (
    <div className="w-full">
      <div className="text-xl">Last month:</div>
      <div className="flex w-full justify-between">
        <div className="mt-3 w-full">
          <div className="flex gap-4">
            {hideBalance ? (
              <i
                className="fa-solid fa-eye cursor-pointer text-[#AAAAAA] transition duration-100 hover:text-[#424242] text-xl"
                onClick={() => setHideBalance(false)}
              ></i>
            ) : (
              <i
                className="fa-solid fa-eye-slash cursor-pointer text-[#AAAAAA] transition duration-100 hover:text-[#424242] text-xl"
                onClick={() => setHideBalance(true)}
              ></i>
            )}
            <div className="text-[#838383] text-sm flex flex-col">
              You have made:
              <span className="text-white text-xl">
                {hideBalance
                  ? "****"
                  : `$${profitLoss ? profitLoss.toFixed(2) : "0.00"}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full">
          <div className="text-[#838383] text-sm flex flex-col">
            You have also won:
            <span className="text-white text-xl">
              {monthsTrades?.filter((trade) => trade.status === "WIN").length}/
              {monthsTrades?.length}{" "}
              <span className="text-[#838383] text-sm">trades.</span>
            </span>
          </div>
        </div>
      </div>
      <div className="mt-10 flex gap-10">
        <div></div>
        <div className="flex w-full">
          <div className="text-[#838383] text-sm flex flex-col">
            You have also completed:
            <span className="text-white text-xl">
              {goals.filter((goal) => goal.complete).length}/{goals.length}{" "}
              <span className="text-[#838383] text-sm">goals.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
