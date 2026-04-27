"use client";

import React, { useEffect, useState } from "react";
import Time from "./components/landing/Time";
import TradeCalendar from "./components/calendar/TradeCalendar";
import TradeStrategies from "./components/lists/TradeStrategies";
import TradeCharts from "./components/charts/TradeCharts";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) return "No user found";

  return (
    <div className="flex flex-col items-center">
      <Time />
      <div className="bg-[#0F0F17] w-[100%] flex flex-col items-center">
        <TradeCalendar userId={userId} />
        <TradeStrategies userId={userId} />
      </div>
      <div className="w-[100%] flex flex-col items-center">
        <TradeCharts userId={userId} />
        {/* <Portfolio userId={userId} /> */}
      </div>
    </div>
  );
}

export default withAuth(Page);
