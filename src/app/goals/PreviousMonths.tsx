"use client";

import React, { useEffect, useState } from "react";
import { Goal } from "../types/Goal";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTrades } from "@/hooks/useTrades";
import { fetchProfit } from "./helpers";

export default function PreviousMonths({ userId }: { userId: string }) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades } = useTrades(userId, simulated);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [availableDates, setAvailableDates] = useState<
    { month: number; year: number }[]
  >([]);
  const [loadingDates, setLoadingDates] = useState<boolean>(true);
  const [loadingGoals, setLoadingGoals] = useState<boolean>(true);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [hideBalance, setHideBalance] = useState<boolean>(true);
  const [profitLoss, setProfitLoss] = useState<number>();

  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!userId) return;

      const res = await fetch(`/api/goals/dates?userId=${userId}`);

      if (!res.ok) throw new Error("Failed to fetch goal dates");

      const data: { month: number; year: number }[] = await res.json();

      setAvailableDates(data);

      if (data.length > 0) {
        setSelectedMonth(data[0].month);
        setSelectedYear(data[0].year);
      }
    };

    fetchAvailableDates();
    setLoadingDates(false);
  }, [userId]);

  useEffect(() => {
    if (selectedMonth != null && selectedYear != null) {
      fetchProfit(selectedMonth, selectedYear, userId, simulated).then(
        (profit) => {
          setProfitLoss(profit);
        }
      );
    }
  }, [selectedMonth, selectedYear, userId, simulated]);

  const chosenMonthTrades = trades?.filter((trade) => {
    const isClosed = trade.status === "WIN" || trade.status === "LOSS";
    const dateStr =
      isClosed && trade.dateClosed ? trade.dateClosed : trade.dateBought;
    const tradeDate = new Date(dateStr);

    return (
      tradeDate.getMonth() === selectedMonth &&
      tradeDate.getFullYear() === selectedYear
    );
  });

  useEffect(() => {
    const fetchGoals = async () => {
      if (!userId || selectedMonth === null || selectedYear === null) return;

      const res = await fetch(
        `/api/goals?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`
      );
      if (!res.ok) throw new Error("Failed to fetch goals");

      const data = await res.json();
      setGoals(data);
    };

    fetchGoals();
    setLoadingGoals(false);
  }, [userId, selectedMonth, selectedYear]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-10">
        <div className="text-xl">Previous goals</div>
        <div className="flex gap-4 items-center text-white">
          {loadingDates ? (
            <i className="fa-solid fa-circle-notch fa-spin"></i>
          ) : (
            <>
              {/* Month dropdown */}
              <select
                value={selectedMonth ?? ""}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white p-1 rounded border border-white/30 cursor-pointer transition duration-100 hover:border-white/100"
              >
                {availableDates
                  .filter(
                    (v, i, self) =>
                      self.findIndex(
                        (x) => x.month === v.month && x.year === v.year
                      ) === i
                  )
                  .map(({ month, year }) => (
                    <option key={`${month}-${year}`} value={month}>
                      {months[month]}
                    </option>
                  ))}
              </select>

              {/* Year dropdown */}
              <select
                value={selectedYear ?? ""}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white p-1 rounded border border-white/30 cursor-pointer transition duration-100 hover:border-white/100"
              >
                {Array.from(new Set(availableDates.map((d) => d.year))).map(
                  (year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                )}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Goals list */}
      <div className="flex justify-between">
        <div className="w-full">
          {loadingGoals ? (
            <i className="fa-solid fa-circle-notch fa-spin"></i>
          ) : goals.length > 0 ? (
            goals.map((goal) => (
              <div key={goal._id} className="flex gap-3">
                <div>
                  {goal.complete ? (
                    <i className="fa-solid fa-check text-green-500"></i>
                  ) : (
                    <i className="fa-solid fa-x text-red-500"></i>
                  )}
                </div>
                <div>{goal.goal}</div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 mt-3">
              No goals found for this month.
            </div>
          )}
        </div>
        <div className="flex flex-col w-full">
          <div className="flex justify-between">
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
                    {hideBalance ? (
                      "****"
                    ) : profitLoss ? (
                      profitLoss > 0 ? (
                        <span className="text-green-500">
                          ${profitLoss.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-red-500">
                          ${profitLoss.toFixed(2)}
                        </span>
                      )
                    ) : (
                      <span>$0.00</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full">
              <div className="text-[#838383] text-sm flex flex-col">
                You have also won:
                <span className="text-white text-xl">
                  {
                    chosenMonthTrades?.filter((trade) => trade.status === "WIN")
                      .length
                  }
                  /{chosenMonthTrades?.length}{" "}
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
      </div>
    </div>
  );
}
