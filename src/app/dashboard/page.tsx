"use client";

import React, { useEffect, useState } from "react";
import Time from "./components/landing/Time";
import TradeCalendar from "./components/calendar/TradeCalendar";
import TradeStrategies from "./components/lists/TradeStrategies";
import TradeCharts from "./components/charts/TradeCharts";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";
import Portfolio from "./components/portfolio/Portfolio";

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [simulated, setSimulated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("simulated") === "true";
    }
    return false;
  });

  useEffect(() => {
    const stored = localStorage.getItem("simulated");
    if (stored !== null) {
      setSimulated(stored === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("simulated", String(simulated));
  }, [simulated]);

  if (!userId) return "No user found";

  return (
    <div className="flex flex-col items-center">
      <Time />
      <div className="bg-[#0F0F17] w-[100%] flex flex-col items-center">
        <div className=" w-full max-w-400 px-10 py-5">
          <label className="inline-flex items-center cursor-pointer flex gap-2">
            <input
              type="checkbox"
              checked={simulated}
              onChange={(e) => {
                setSimulated(e.target.checked);
                window.location.reload();
              }}
              className="sr-only peer"
            />
            <div
              className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
            peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 
            peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
            peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
            after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
            after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 
            dark:peer-checked:bg-blue-600"
            />
            <span>Simulated trading</span>
          </label>
        </div>
        <TradeCalendar userId={userId} />
        <TradeStrategies userId={userId} />
      </div>
      <div className="w-[100%] flex flex-col items-center">
        <TradeCharts userId={userId} />
        <Portfolio userId={userId} />
      </div>
    </div>
  );
}

export default withAuth(Page);
