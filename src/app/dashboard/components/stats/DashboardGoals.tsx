"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Goal } from "@/app/types/Goal";

/**
 * Compact goals widget for the dashboard. Shows the current month's goal
 * list, a completion bar, and a link to the full Goals page.
 */
export default function DashboardGoals({ userId }: { userId: string }) {
  const today = useMemo(() => new Date(), []);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(
      `/api/goals?userId=${userId}&month=${today.getMonth()}&year=${today.getFullYear()}`,
    )
      .then((r) => r.json())
      .then((data: Goal[]) => setGoals(data))
      .finally(() => setLoading(false));
  }, [userId, today]);

  const completed = goals.filter((g) => g.complete).length;
  const total = goals.length;
  const completionPct = total > 0 ? (completed / total) * 100 : 0;
  const allDone = total > 0 && completed === total;

  // Toggle a goal's complete state — same endpoint as the Goals page.
  const toggle = async (g: Goal) => {
    const optimistic = goals.map((x) =>
      x._id === g._id ? { ...x, complete: !g.complete } : x,
    );
    setGoals(optimistic);
    try {
      const res = await fetch(`/api/goals/${g._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: !g.complete }),
      });
      if (!res.ok) throw new Error("Failed to toggle goal");
      const updated: Goal = await res.json();
      setGoals((prev) =>
        prev.map((x) => (x._id === updated._id ? updated : x)),
      );
    } catch {
      // Roll back if the request fails.
      setGoals((prev) =>
        prev.map((x) => (x._id === g._id ? { ...x, complete: g.complete } : x)),
      );
    }
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-5 md:px-10 flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="md:text-xl text-sm font-bold">Goals at a glance</h2>
          <span className="text-xs text-white/40">
            {format(today, "MMMM yyyy")}
          </span>
        </div>
        <Link
          href="/goals"
          className="text-xs text-white/60 hover:text-white flex items-center gap-1 transition"
        >
          View all
          <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </Link>
      </div>

      <div className="border border-[#282828] rounded-lg p-4 md:p-6 flex flex-col gap-3">
        {loading ? (
          <div className="text-xs text-white/40 py-2">Loading…</div>
        ) : total === 0 ? (
          <div className="text-sm text-white/50 py-4 text-center border border-dashed border-white/10 rounded-md">
            No goals set for {format(today, "MMMM")}.{" "}
            <Link
              href="/goals"
              className="text-white underline-offset-2 hover:underline"
            >
              Add one
            </Link>
            .
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>
                {completed} of {total} completed
              </span>
              <span className={allDone ? "text-green-500" : ""}>
                {completionPct.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-[width] duration-300 ${
                  allDone ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <ul className="flex flex-col gap-1 mt-1">
              {goals.map((g) => (
                <li
                  key={g._id}
                  className={`flex items-center gap-3 p-2 rounded-md transition ${
                    g.complete ? "bg-green-500/5" : "hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={g.complete}
                    onChange={() => toggle(g)}
                    className="w-4 h-4 accent-green-500 cursor-pointer shrink-0"
                  />
                  <span
                    className={`text-sm md:text-base truncate ${
                      g.complete ? "text-white/50 line-through" : "text-white"
                    }`}
                  >
                    {g.goal}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
