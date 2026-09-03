"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Reflect the current page in the browser tab as "Cuequill - <Page>",
// using the same labels shown in the sidebar. Keyed on the first path
// segment of the signed-in app. Marketing/public routes (the landing at
// "/", /features, /pricing, /login, /signup, /privacy, /terms) are left
// untouched so their own metadata governs the tab title.
const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  chat: "Quill AI",
  trades: "Trades",
  calendar: "Calendar",
  reports: "Reports",
  balance: "Balance",
  strategies: "Strategies",
  stocks: "Stocks & ETFs",
  earnings: "Earnings",
  goals: "Goals",
  challenges: "Challenges",
  trophies: "Trophies",
  leaderboard: "Leaderboard",
  rules: "Rules",
  affirmations: "Affirmations",
  settings: "Settings",
  community: "Community",
};

export default function DocumentTitle() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const seg = pathname.split("/").filter(Boolean)[0] ?? "";
    const label = TITLES[seg];
    if (label) document.title = `Cuequill - ${label}`;
  }, [pathname]);

  return null;
}
