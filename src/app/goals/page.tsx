"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Goal } from "../types/Goal";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { withAuth } from "@/lib/withAuth";
import {
  handleAddGoal,
  handleDeleteGoal,
  handleSaveEdit,
  handleToggleComplete,
} from "./helpers";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Goals page ────────────────────────────────────────────────────────
function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades } = useTrades(userId, simulated);

  const today = useMemo(() => new Date(), []);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [availableDates, setAvailableDates] = useState<
    { month: number; year: number }[]
  >([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");

  // Fetch current-month goals
  useEffect(() => {
    if (!userId) return;
    setLoadingGoals(true);
    fetch(
      `/api/goals?userId=${userId}&month=${today.getMonth()}&year=${today.getFullYear()}`,
    )
      .then((r) => r.json())
      .then((data: Goal[]) => setGoals(data))
      .finally(() => setLoadingGoals(false));
  }, [userId, today]);

  // Fetch dates for previous-month browser
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/goals/dates?userId=${userId}`)
      .then((r) => r.json())
      .then((data: { month: number; year: number }[]) =>
        setAvailableDates(data),
      );
  }, [userId]);

  // Current month P/L from trades
  const monthPL = useMemo(() => {
    if (!trades) return 0;
    const m = today.getMonth();
    const y = today.getFullYear();
    return trades
      .filter((t) => t.status === "WIN" || t.status === "LOSS")
      .filter((t) => {
        const d = new Date(t.dateClosed || t.dateBought);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((s, t) => s + tradeNetPL(t), 0);
  }, [trades, today]);

  const monthTradeCount = useMemo(() => {
    if (!trades) return 0;
    const m = today.getMonth();
    const y = today.getFullYear();
    return trades.filter((t) => {
      const d = new Date(t.dateClosed || t.dateBought);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  }, [trades, today]);

  const completedGoals = goals.filter((g) => g.complete).length;
  const completionPct =
    goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;

  if (!userId) return null;

  return (
    <div className="md:mt-30 mt-23 md:mx-10 mx-5 flex flex-col items-center pb-20">
      {/* Aurora — matches the dashboard / trades / settings hue. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1500px] flex flex-col gap-6 md:gap-10">
        {/* Hero — same language as the Trades page. */}
        <div className="flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            {format(today, "MMMM yyyy")}
          </div>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Goals
              </span>
            </h1>
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[12px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              <span>Add goal</span>
            </button>
          </div>
        </div>

        {/* Month progress tiles */}
        <div className="flex flex-wrap gap-2 md:gap-3">
          <ProgressTile
            label="Net P/L"
            value={
              monthTradeCount === 0
                ? "—"
                : `${monthPL >= 0 ? "+" : "−"}$${Math.abs(monthPL).toFixed(2)}`
            }
            tone={
              monthTradeCount === 0
                ? "neutral"
                : monthPL >= 0
                  ? "good"
                  : "bad"
            }
          />
          <ProgressTile
            label="Trades this month"
            value={`${monthTradeCount}`}
            tone="neutral"
          />
          <ProgressTile
            label="Goals completed"
            value={
              goals.length === 0
                ? "—"
                : `${completedGoals} / ${goals.length}`
            }
            tone={
              completedGoals === goals.length && goals.length > 0
                ? "good"
                : "neutral"
            }
          />
          <ProgressTile
            label="Completion rate"
            value={goals.length === 0 ? "—" : `${completionPct.toFixed(0)}%`}
            tone={
              completionPct >= 80
                ? "good"
                : completionPct >= 40
                  ? "neutral"
                  : "bad"
            }
          />
        </div>

        {/* Current month goals */}
        <section className="border border-[#282828] rounded-lg p-4 md:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm md:text-base font-semibold">
              Goals for {format(today, "MMMM")}
            </h2>
            {goals.length > 0 && (
              <span className="text-xs text-white/40">
                {completedGoals}/{goals.length}
              </span>
            )}
          </div>

          {goals.length > 0 && (
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-[width] duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          )}

          {loadingGoals ? (
            <div className="text-xs text-white/40 py-4">Loading…</div>
          ) : goals.length === 0 ? (
            <div className="text-sm text-white/50 py-4 text-center border border-dashed border-white/10 rounded-md">
              No goals yet. Click <span className="text-white">Add goal</span>{" "}
              to set your first one.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {goals.map((g) => (
                <GoalRow key={g._id} goal={g} setGoals={setGoals} />
              ))}
            </ul>
          )}
        </section>

        {/* Previous months */}
        <PreviousMonthsSection
          userId={userId}
          availableDates={availableDates}
          allTrades={trades ?? []}
          currentMonth={today.getMonth()}
          currentYear={today.getFullYear()}
        />
      </div>

      {/* Add goal modal */}
      <AnimatePresence>
        {isAddOpen && (
          <AddGoalModal
            onClose={() => {
              setIsAddOpen(false);
              setNewGoalText("");
            }}
            value={newGoalText}
            setValue={setNewGoalText}
            onSave={() =>
              handleAddGoal(
                newGoalText,
                userId,
                setNewGoalText,
                setGoals,
                setIsAddOpen,
              )
            }
            monthLabel={format(today, "MMM yyyy")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tiles ────────────────────────────────────────────────────────────
function ProgressTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
}) {
  const valueColor =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-white";
  return (
    <div className="border border-[#282828] rounded-lg p-2 md:p-4 flex flex-col gap-1 md:gap-2 min-w-0 basis-[120px] md:basis-[200px] grow md:max-w-[280px]">
      <div className="text-[10px] md:text-xs text-white/50 uppercase tracking-wide truncate">
        {label}
      </div>
      <div
        className={`text-sm md:text-2xl font-semibold truncate ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Goal row ─────────────────────────────────────────────────────────
function GoalRow({
  goal,
  setGoals,
}: {
  goal: Goal;
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.goal);

  return (
    <li
      className={`group flex items-center gap-3 p-2 rounded-lg transition ${
        goal.complete ? "bg-teal-500/[0.06]" : "hover:bg-white/5"
      }`}
    >
      {/* Custom check button — matches the affirmations checkmark. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={goal.complete}
        onClick={() =>
          handleToggleComplete(goal._id, !goal.complete, setGoals)
        }
        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition cursor-pointer ${
          goal.complete
            ? "bg-teal-500 text-white"
            : "bg-white/5 border border-white/15 text-transparent group-hover:text-white/40 hover:!text-white/70 hover:border-white/30"
        }`}
      >
        <i className="fa-solid fa-check" />
      </button>
      {editing ? (
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSaveEdit(goal._id, draft, setDraft, setGoals, () =>
                setEditing(false),
              );
            }
            if (e.key === "Escape") {
              setDraft(goal.goal);
              setEditing(false);
            }
          }}
          onBlur={() =>
            handleSaveEdit(goal._id, draft, setDraft, setGoals, () =>
              setEditing(false),
            )
          }
          className="flex-1 bg-[#1A1A1D] text-white text-sm md:text-base p-1.5 rounded focus:outline-none border border-white/10 focus:border-white/30"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(goal.goal);
            setEditing(true);
          }}
          className={`flex-1 text-left text-sm md:text-base truncate cursor-text ${
            goal.complete ? "text-white/50 line-through" : "text-white"
          }`}
        >
          {goal.goal}
        </button>
      )}
      <button
        onClick={() => handleDeleteGoal(goal._id, setGoals)}
        className="opacity-0 group-hover:opacity-100 transition text-white/40 hover:text-red-500 text-xs p-1 cursor-pointer"
        aria-label="Delete goal"
      >
        <i className="fa-solid fa-trash-can"></i>
      </button>
    </li>
  );
}

// ─── Previous months ───────────────────────────────────────────────────
function PreviousMonthsSection({
  userId,
  availableDates,
  allTrades,
  currentMonth,
  currentYear,
}: {
  userId: string;
  availableDates: { month: number; year: number }[];
  allTrades: import("../types/Trades").Trade[];
  currentMonth: number;
  currentYear: number;
}) {
  // Dedupe + exclude the current month
  const past = useMemo(() => {
    const seen = new Set<string>();
    return availableDates
      .filter(({ month, year }) => {
        const k = `${year}-${month}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return !(month === currentMonth && year === currentYear);
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [availableDates, currentMonth, currentYear]);

  if (past.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="md:text-xl text-sm font-bold">Previous months</h2>
      <div className="flex flex-col gap-2">
        {past.map(({ month, year }) => (
          <PreviousMonthCard
            key={`${year}-${month}`}
            userId={userId}
            month={month}
            year={year}
            allTrades={allTrades}
          />
        ))}
      </div>
    </section>
  );
}

function PreviousMonthCard({
  userId,
  month,
  year,
  allTrades,
}: {
  userId: string;
  month: number;
  year: number;
  allTrades: import("../types/Trades").Trade[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [loading, setLoading] = useState(false);

  const monthPL = useMemo(() => {
    return allTrades
      .filter((t) => t.status === "WIN" || t.status === "LOSS")
      .filter((t) => {
        const d = new Date(t.dateClosed || t.dateBought);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((s, t) => s + tradeNetPL(t), 0);
  }, [allTrades, month, year]);

  const tradeCount = useMemo(
    () =>
      allTrades.filter((t) => {
        const d = new Date(t.dateClosed || t.dateBought);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length,
    [allTrades, month, year],
  );

  useEffect(() => {
    if (!expanded || goals !== null) return;
    setLoading(true);
    fetch(`/api/goals?userId=${userId}&month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((data: Goal[]) => setGoals(data))
      .finally(() => setLoading(false));
  }, [expanded, userId, month, year, goals]);

  const completed = goals?.filter((g) => g.complete).length ?? 0;
  const completionPct =
    goals && goals.length > 0 ? (completed / goals.length) * 100 : 0;

  return (
    <div className="border border-[#282828] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 p-3 md:p-4 hover:bg-white/5 transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <i
            className={`fa-solid fa-chevron-right text-[10px] text-white/50 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          ></i>
          <div className="text-sm md:text-base font-semibold">
            {MONTHS[month]} {year}
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm">
          <span className="text-white/40 hidden md:inline">
            {tradeCount} trade{tradeCount === 1 ? "" : "s"}
          </span>
          <span
            className={
              tradeCount === 0
                ? "text-white/40"
                : monthPL >= 0
                  ? "text-green-500 font-medium"
                  : "text-red-500 font-medium"
            }
          >
            {tradeCount === 0
              ? "—"
              : `${monthPL >= 0 ? "+" : "−"}$${Math.abs(monthPL).toFixed(2)}`}
          </span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-3 md:p-4 flex flex-col gap-2">
              {loading ? (
                <div className="text-xs text-white/40">Loading…</div>
              ) : !goals || goals.length === 0 ? (
                <div className="text-xs text-white/40">
                  No goals were set for this month.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>
                      {completed} of {goals.length} completed
                    </span>
                    <span>{completionPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <ul className="flex flex-col gap-1 mt-1">
                    {goals.map((g) => (
                      <li
                        key={g._id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <i
                          className={`fa-solid ${
                            g.complete
                              ? "fa-circle-check text-green-500"
                              : "fa-circle-xmark text-red-500"
                          } text-xs`}
                        ></i>
                        <span
                          className={
                            g.complete
                              ? "text-white/50 line-through"
                              : "text-white"
                          }
                        >
                          {g.goal}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Add modal ─────────────────────────────────────────────────────────
function AddGoalModal({
  onClose,
  value,
  setValue,
  onSave,
  monthLabel,
}: {
  onClose: () => void;
  value: string;
  setValue: (v: string) => void;
  onSave: () => void;
  monthLabel: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex md:items-center md:justify-center items-stretch justify-stretch z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col gap-4 bg-[#0F0F17] md:p-6 p-4 md:rounded-xl md:w-[90%] md:max-w-md w-full text-white md:h-auto h-full"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      >
        <div>
          <div className="text-xs text-white/50 uppercase tracking-wide">
            New goal · {monthLabel}
          </div>
          <div className="text-base md:text-lg font-semibold mt-1">
            What do you want to achieve?
          </div>
        </div>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSave();
          }}
          placeholder="e.g. Hit $1,000 net P/L"
          className="bg-[#1A1A1D] border border-white/10 focus:border-white/30 text-base text-white p-2.5 rounded-md focus:outline-none"
        />
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!value.trim()}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
              value.trim()
                ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
            }`}
          >
            <i className="fa-solid fa-check text-[11px]" />
            Save goal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default withAuth(Page);
