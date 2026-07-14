"use client";

import React from "react";
import Time from "./components/landing/Time";
import TradeCalendar from "./components/calendar/TradeCalendar";
import DashboardStats from "./components/stats/DashboardStats";
import DashboardActivity from "./components/stats/DashboardActivity";
import DashboardInsights from "./components/insights/DashboardInsights";
import DashboardUpcoming from "./components/upcoming/DashboardUpcoming";
import DashboardGoals from "./components/goals/DashboardGoals";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) return "No user found";

  return (
    <div className="flex flex-col md:items-start">
      <Time />
      <div className="w-[100%] flex flex-col md:items-start gap-8 md:gap-12 py-8 md:py-12">
        <TradeCalendar userId={userId} />
        <DashboardUpcoming />
        <DashboardGoals />
        <DashboardActivity userId={userId} />
        <DashboardStats userId={userId} />
        <DashboardInsights userId={userId} />
        {/* <Portfolio userId={userId} /> */}
      </div>
    </div>
  );
}

export default withAuth(Page);
