"use client";

import React from "react";
import DashboardStats from "./components/stats/DashboardStats";
import DashboardEquity from "./components/stats/DashboardEquity";
import DashboardRiskBudget from "./components/insights/DashboardRiskBudget";
import DashboardOpenPositions from "./components/stats/DashboardOpenPositions";
import DashboardRecentCloses from "./components/stats/DashboardRecentCloses";
import DashboardWinLoss from "./components/stats/DashboardWinLoss";
import DashboardUpcoming from "./components/upcoming/DashboardUpcoming";
import DashboardGoals from "./components/goals/DashboardGoals";
import DashboardEdge from "./components/insights/DashboardEdge";
import DashboardMistakes from "./components/insights/DashboardMistakes";

// A dashboard widget is a self-contained card that fetches its own data.
// `render` receives the current user id (widgets that don't need it just
// ignore it). The registry is the single source of truth for which
// widgets exist, their display name, and their default ordering — the
// customisable grid reads layout as an ordered list of these ids.
export type WidgetId =
  | "glance"
  | "equity"
  | "riskBudget"
  | "openPositions"
  | "recentCloses"
  | "winLoss"
  | "upcoming"
  | "goals"
  | "edge"
  | "mistakes";

export type WidgetDef = {
  id: WidgetId;
  title: string;
  // rowSpan is the widget's current height in grid rows (1–3); widgets that
  // scroll conditionally (e.g. Upcoming) use it, most ignore it.
  render: (userId: string, rowSpan: number) => React.ReactNode;
};

export const WIDGETS: WidgetDef[] = [
  {
    id: "glance",
    title: "At a glance",
    render: (userId) => <DashboardStats userId={userId} />,
  },
  {
    id: "equity",
    title: "Recent equity",
    render: (userId) => <DashboardEquity userId={userId} />,
  },
  {
    id: "riskBudget",
    title: "Daily risk budget",
    render: (userId) => <DashboardRiskBudget userId={userId} />,
  },
  {
    id: "openPositions",
    title: "Open positions",
    render: (userId) => <DashboardOpenPositions userId={userId} />,
  },
  {
    id: "recentCloses",
    title: "Recent closes",
    render: (userId) => <DashboardRecentCloses userId={userId} />,
  },
  {
    id: "winLoss",
    title: "Win / loss",
    render: (userId) => <DashboardWinLoss userId={userId} />,
  },
  {
    id: "upcoming",
    title: "Upcoming events",
    render: () => <DashboardUpcoming />,
  },
  {
    id: "goals",
    title: "Goals",
    render: () => <DashboardGoals />,
  },
  {
    id: "edge",
    title: "Strategy edge",
    render: (userId) => <DashboardEdge userId={userId} />,
  },
  {
    id: "mistakes",
    title: "Mistake leaderboard",
    render: (userId) => <DashboardMistakes userId={userId} />,
  },
];

export const WIDGET_MAP: Record<WidgetId, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.id, w]),
) as Record<WidgetId, WidgetDef>;

// Default layout — the order the dashboard ships with before any
// customisation. All widgets enabled. Ordered so the default row heights
// pair up cleanly (the two short one-row widgets — risk budget and
// win/loss — sit together at the end) rather than brick-laying.
export const DEFAULT_LAYOUT: WidgetId[] = [
  "glance",
  "equity",
  "openPositions",
  "recentCloses",
  "upcoming",
  "goals",
  "edge",
  "mistakes",
  "riskBudget",
  "winLoss",
];

export const ALL_WIDGET_IDS = new Set<WidgetId>(WIDGETS.map((w) => w.id));

// Drop unknown ids (e.g. a widget removed in a later release) and keep the
// stored order. Used when hydrating layout from localStorage.
export function sanitizeLayout(ids: unknown): WidgetId[] {
  if (!Array.isArray(ids)) return [...DEFAULT_LAYOUT];
  const seen = new Set<WidgetId>();
  const out: WidgetId[] = [];
  for (const id of ids) {
    if (ALL_WIDGET_IDS.has(id as WidgetId) && !seen.has(id as WidgetId)) {
      seen.add(id as WidgetId);
      out.push(id as WidgetId);
    }
  }
  return out;
}
