"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Goal, GoalPeriod } from "../types/Goal";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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

type MonthlyDate = { month: number; year: number };
type DailyDate = { day: number; month: number; year: number };

// ─── Goals page ────────────────────────────────────────────────────────
function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useLocalStorage<GoalPeriod>(
    "goalsPeriod",
    "monthly"
  );

  const [goals, setGoals] = useState<Goal[]>([]);
  const [previousMonths, setPreviousMonths] = useState<MonthlyDate[]>([]);
  const [previousDays, setPreviousDays] = useState<DailyDate[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoadingGoals(true);
    const url =
      period === "monthly"
        ? `/api/goals?userId=${userId}&period=monthly&month=${today.getMonth()}&year=${today.getFullYear()}`
        : `/api/goals?userId=${userId}&period=daily&day=${today.getDate()}&month=${today.getMonth()}&year=${today.getFullYear()}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: Goal[]) => setGoals(data))
      .finally(() => setLoadingGoals(false));
  }, [userId, today, period]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/goals/dates?userId=${userId}&period=${period}`)
      .then((r) => r.json())
      .then((data) => {
        if (period === "monthly") setPreviousMonths(data);
        else setPreviousDays(data);
      });
  }, [userId, period]);

  const completedGoals = goals.filter((g) => g.complete).length;
  const completionPct =
    goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;

  if (!userId) return null;

  const headerDate =
    period === "monthly"
      ? format(today, "MMMM yyyy")
      : format(today, "EEEE, MMM d yyyy");

  const periodLabel = period === "monthly" ? format(today, "MMMM") : "Today";

  return (
    <div className="md:mt-30 mt-23 md:mx-10 mx-5 flex flex-col items-center pb-20">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[720px] flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
            {headerDate}
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Goals
              </span>
            </h1>
            <PeriodToggle period={period} setPeriod={setPeriod} />
          </div>
        </div>

        {/* Current period */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-white/80">
              {periodLabel}
            </h2>
            {goals.length > 0 && (
              <span className="text-xs text-white/45 tabular-nums">
                {completedGoals} of {goals.length} ·{" "}
                {completionPct.toFixed(0)}%
              </span>
            )}
          </div>

          {goals.length > 0 && (
            <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-400/70 transition-[width] duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          )}

          <ul className="flex flex-col mt-1">
            <AddGoalRow
              userId={userId}
              period={period}
              setGoals={setGoals}
            />
            {loadingGoals && goals.length === 0 ? (
              <li className="text-xs text-white/40 py-3 px-2">Loading…</li>
            ) : (
              goals.map((g) => (
                <GoalRow key={g._id} goal={g} setGoals={setGoals} />
              ))
            )}
          </ul>
        </section>

        {/* Previous periods */}
        {period === "monthly" ? (
          <PreviousMonthsSection
            userId={userId}
            availableDates={previousMonths}
            currentMonth={today.getMonth()}
            currentYear={today.getFullYear()}
          />
        ) : (
          <PreviousDaysSection
            userId={userId}
            availableDates={previousDays}
            currentDay={today.getDate()}
            currentMonth={today.getMonth()}
            currentYear={today.getFullYear()}
          />
        )}
      </div>
    </div>
  );
}

// ─── Period toggle ─────────────────────────────────────────────────────
function PeriodToggle({
  period,
  setPeriod,
}: {
  period: GoalPeriod;
  setPeriod: React.Dispatch<React.SetStateAction<GoalPeriod>>;
}) {
  const options: GoalPeriod[] = ["daily", "monthly"];
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[12px] font-medium">
      {options.map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-3 py-1 rounded-full capitalize transition cursor-pointer ${
            period === p
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ─── Inline add row ────────────────────────────────────────────────────
function AddGoalRow({
  userId,
  period,
  setGoals,
}: {
  userId: string;
  period: GoalPeriod;
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    const ok = await handleAddGoal(text.trim(), userId, period, setGoals);
    if (ok) setText("");
    setSaving(false);
  };

  return (
    <li className="group flex items-center gap-3 py-2 px-2 rounded-lg">
      <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/30 group-focus-within:text-teal-400 transition">
        <i className="fa-solid fa-plus text-[11px]" />
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setText("");
        }}
        placeholder={
          period === "daily" ? "Add a goal for today…" : "Add a goal…"
        }
        className="flex-1 bg-transparent text-sm md:text-base placeholder:text-white/30 text-white focus:outline-none"
      />
      {text.trim() && (
        <button
          onClick={save}
          disabled={saving}
          className="text-xs text-teal-300 hover:text-teal-200 transition cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </li>
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
      className={`group flex items-center gap-3 py-2 px-2 rounded-lg transition ${
        goal.complete ? "" : "hover:bg-white/[0.03]"
      }`}
    >
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
            : "bg-transparent border border-white/15 text-transparent hover:border-white/40 hover:text-white/40"
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
                setEditing(false)
              );
            }
            if (e.key === "Escape") {
              setDraft(goal.goal);
              setEditing(false);
            }
          }}
          onBlur={() =>
            handleSaveEdit(goal._id, draft, setDraft, setGoals, () =>
              setEditing(false)
            )
          }
          className="flex-1 bg-transparent text-sm md:text-base p-0 focus:outline-none text-white"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(goal.goal);
            setEditing(true);
          }}
          className={`flex-1 text-left text-sm md:text-base truncate cursor-text ${
            goal.complete ? "text-white/40 line-through" : "text-white"
          }`}
        >
          {goal.goal}
        </button>
      )}
      <button
        onClick={() => handleDeleteGoal(goal._id, setGoals)}
        className="opacity-0 group-hover:opacity-100 transition text-white/30 hover:text-red-400 text-xs p-1 cursor-pointer"
        aria-label="Delete goal"
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </li>
  );
}

// ─── Previous months ───────────────────────────────────────────────────
function PreviousMonthsSection({
  userId,
  availableDates,
  currentMonth,
  currentYear,
}: {
  userId: string;
  availableDates: MonthlyDate[];
  currentMonth: number;
  currentYear: number;
}) {
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
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
        Previous months
      </h2>
      <ul className="flex flex-col">
        {past.map(({ month, year }) => (
          <PreviousPeriodRow
            key={`${year}-${month}`}
            userId={userId}
            label={`${MONTHS[month]} ${year}`}
            queryString={`period=monthly&month=${month}&year=${year}`}
          />
        ))}
      </ul>
    </section>
  );
}

// ─── Previous days ─────────────────────────────────────────────────────
function PreviousDaysSection({
  userId,
  availableDates,
  currentDay,
  currentMonth,
  currentYear,
}: {
  userId: string;
  availableDates: DailyDate[];
  currentDay: number;
  currentMonth: number;
  currentYear: number;
}) {
  const past = useMemo(() => {
    const seen = new Set<string>();
    return availableDates
      .filter(({ day, month, year }) => {
        const k = `${year}-${month}-${day}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return !(
          day === currentDay &&
          month === currentMonth &&
          year === currentYear
        );
      })
      .sort(
        (a, b) => b.year - a.year || b.month - a.month || b.day - a.day
      );
  }, [availableDates, currentDay, currentMonth, currentYear]);

  if (past.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
        Previous days
      </h2>
      <ul className="flex flex-col">
        {past.map(({ day, month, year }) => (
          <PreviousPeriodRow
            key={`${year}-${month}-${day}`}
            userId={userId}
            label={format(new Date(year, month, day), "EEE, MMM d yyyy")}
            queryString={`period=daily&day=${day}&month=${month}&year=${year}`}
          />
        ))}
      </ul>
    </section>
  );
}

// Shared collapsed-row used by both Previous Months and Previous Days. Each
// row shows a compact completion ratio and expands to reveal the goal list.
function PreviousPeriodRow({
  userId,
  label,
  queryString,
}: {
  userId: string;
  label: string;
  queryString: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || goals !== null) return;
    setLoading(true);
    fetch(`/api/goals?userId=${userId}&${queryString}`)
      .then((r) => r.json())
      .then((data: Goal[]) => setGoals(data))
      .finally(() => setLoading(false));
  }, [expanded, userId, queryString, goals]);

  const completed = goals?.filter((g) => g.complete).length ?? 0;
  const total = goals?.length ?? 0;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <li className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 py-3 px-2 hover:bg-white/[0.02] transition cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <i
            className={`fa-solid fa-chevron-right text-[9px] text-white/30 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
          <span className="text-sm text-white/85 truncate">{label}</span>
        </div>
        <span className="text-xs text-white/40 tabular-nums shrink-0">
          {total === 0 ? "—" : `${completed}/${total} · ${pct.toFixed(0)}%`}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pl-7 pr-2 pb-3 flex flex-col gap-1">
              {loading ? (
                <div className="text-xs text-white/40">Loading…</div>
              ) : !goals || goals.length === 0 ? (
                <div className="text-xs text-white/40">No goals were set.</div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {goals.map((g) => (
                    <li
                      key={g._id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <i
                        className={`fa-solid ${
                          g.complete
                            ? "fa-circle-check text-teal-400"
                            : "fa-circle text-white/15"
                        } text-[11px]`}
                      />
                      <span
                        className={
                          g.complete
                            ? "text-white/40 line-through"
                            : "text-white/85"
                        }
                      >
                        {g.goal}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default withAuth(Page);
