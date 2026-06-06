"use client";

import React, { useEffect, useState } from "react";
import Time from "./components/landing/Time";
import TradeCalendar from "./components/calendar/TradeCalendar";
import DashboardStats from "./components/stats/DashboardStats";
import DashboardGoals from "./components/stats/DashboardGoals";
import DashboardActivity from "./components/stats/DashboardActivity";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) return "No user found";

  return (
    <div className="flex flex-col items-center">
      <Time />
      <div className="w-[100%] flex flex-col items-center gap-8 md:gap-12 py-8 md:py-12">
        <TradeCalendar userId={userId} />
        <DashboardActivity userId={userId} />
        <DashboardGoals userId={userId} />
        <DashboardStats userId={userId} />
        {/* <Portfolio userId={userId} /> */}
      </div>
    </div>
  );
}

export default withAuth(Page);
