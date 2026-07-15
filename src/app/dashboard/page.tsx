"use client";

import React from "react";
import Time from "./components/landing/Time";
import TradeCalendar from "./components/calendar/TradeCalendar";
import DashboardStats from "./components/stats/DashboardStats";
import DashboardEquity from "./components/stats/DashboardEquity";
import DashboardActivity from "./components/stats/DashboardActivity";
import DashboardInsights from "./components/insights/DashboardInsights";
import DashboardRiskBudget from "./components/insights/DashboardRiskBudget";
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
            holds two widget cards side by side. The grid's default
            align-items: stretch equalises the height of the two cards in a
            row (so Open positions matches Recent closes, Upcoming matches
            Goals, etc.). The first row is the exception — "At a glance" and
            the equity+risk stack keep their natural height via self-start,
            so a short card there isn't stretched to a tall neighbour. */}
        <div className="w-full max-w-[1600px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Row 1 — left: at-a-glance summary; right: equity chart with
                the daily risk budget stacked directly beneath it. */}
            <div className="self-start">
              <DashboardStats userId={userId} />
            </div>
            <div className="self-start flex flex-col gap-4 md:gap-6">
              <DashboardEquity userId={userId} />
              <DashboardRiskBudget userId={userId} />
            </div>

            {/* Paired rows — grid stretch makes each pair equal height. */}
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
