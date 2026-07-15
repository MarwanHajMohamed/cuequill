"use client";

import React from "react";
import Time from "./components/landing/Time";
import TradeCalendar from "./components/calendar/TradeCalendar";
import DashboardGrid from "./DashboardGrid";
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
        {/* Everything below the calendar is a customisable 2-up grid of
            widget cards — drag to reorder, remove, or add via the
            Customize toolbar. Layout persists per browser. */}
        <DashboardGrid userId={userId} />
      </div>
    </div>
  );
}

export default withAuth(Page);
