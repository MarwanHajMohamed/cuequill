"use client";

import React from "react";
import Time from "./components/landing/Time";
import TradeCalendar from "./components/calendar/TradeCalendar";
import DashboardStats from "./components/stats/DashboardStats";
import DashboardActivity from "./components/stats/DashboardActivity";
import DashboardInsights from "./components/insights/DashboardInsights";
import DashboardUpcoming from "./components/upcoming/DashboardUpcoming";
import DashboardGoals from "./components/goals/DashboardGoals";
import DashboardWinLoss from "./components/stats/DashboardWinLoss";
import { withAuth } from "@/lib/withAuth";
import { useSession } from "next-auth/react";

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) return "No user found";

  return (
    <div className="flex flex-col md:items-start">
      <Time />
      <div className="w-full flex flex-col gap-8 md:gap-12 py-8 md:py-12">
        <TradeCalendar userId={userId} />

        {/* Everything below the calendar flows into a 2-up grid: each row
            holds two widget cards side by side. Cards are self-contained
            grid items, so hidden ones (e.g. Goals for free users, Insights
            before any trades) simply reflow. items-start keeps rows from
            stretching a short card to match a tall neighbour. */}
        <div className="w-full max-w-[1600px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
            <DashboardStats userId={userId} />
            <DashboardActivity userId={userId} />
            <DashboardUpcoming />
            <DashboardGoals />
            <DashboardInsights userId={userId} />
            <DashboardWinLoss userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Page);
