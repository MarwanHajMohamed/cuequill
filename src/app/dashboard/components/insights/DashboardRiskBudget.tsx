"use client";

import React, { useMemo, useState } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { Trade } from "@/app/types/Trades";

// Daily risk budget: how much of today's max-daily-loss allowance has
// been spent. Editable cap (persisted). Its own dashboard cell so it can
// stack directly under the equity card.

const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";
const exitDate = (t: Trade): Date => new Date(t.dateClosed || t.dateBought);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function DashboardRiskBudget({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const [budget, setBudget] = useLocalStorage<number>(
    "cuequill:daily-loss-budget",
    200,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(budget));

  const todayNet = useMemo(() => {
    if (!trades) return 0;
    const today = startOfDay(new Date());
    return trades
      .filter(isClosed)
      .filter((t) => exitDate(t) >= today)
      .reduce((sum, t) => sum + tradeNetPL(t), 0);
  }, [trades]);

  if (isLoading || !trades || trades.length === 0) return null;

  const todayLoss = Math.max(0, -todayNet);
  const pct = budget > 0 ? Math.min(100, (todayLoss / budget) * 100) : 0;
  const state =
    pct >= 100 ? "stopped" : pct >= 75 ? "danger" : pct >= 50 ? "warn" : "safe";

  const tone = {
    safe: {
      ring: "border-white/10",
      bg: "bg-white/[0.03]",
      bar: "bg-green-500/70",
      text: "text-green-400",
      eyebrow: "text-white/45",
    },
    warn: {
      ring: "border-yellow-500/25",
      bg: "bg-gradient-to-br from-yellow-500/[0.05] via-white/[0.03] to-white/[0.02]",
      bar: "bg-yellow-500/80",
      text: "text-yellow-300",
      eyebrow: "text-yellow-300/70",
    },
    danger: {
      ring: "border-orange-500/30",
      bg: "bg-gradient-to-br from-orange-500/[0.07] via-white/[0.03] to-white/[0.02]",
      bar: "bg-orange-500/85",
      text: "text-orange-300",
      eyebrow: "text-orange-300/70",
    },
    stopped: {
      ring: "border-red-500/40",
      bg: "bg-gradient-to-br from-red-500/[0.10] via-white/[0.03] to-white/[0.02]",
      bar: "bg-red-500/90",
      text: "text-red-300",
      eyebrow: "text-red-300/80",
    },
  }[state];

  const message =
    state === "stopped"
      ? "Cap hit - stop trading today."
      : state === "danger"
        ? "Approaching cap - tighten size."
        : state === "warn"
          ? "Halfway through your budget."
          : todayNet > 0
            ? "Up on the day."
            : "Plenty of room.";

  const saveBudget = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) {
      setBudget(Math.round(n));
    } else {
      setDraft(String(budget));
    }
    setEditing(false);
  };

  return (
    <div
      className={`rounded-2xl border md:backdrop-blur-md p-4 md:p-5 ${tone.ring} ${tone.bg}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div
          className={`text-[10px] md:text-[11px] tracking-[0.1em] font-medium ${tone.eyebrow}`}
        >
          Daily risk budget
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/45">
          <span>Max daily loss</span>
          {editing ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-white/60">$</span>
              <input
                autoFocus
                type="number"
                min={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={saveBudget}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveBudget();
                  if (e.key === "Escape") {
                    setDraft(String(budget));
                    setEditing(false);
                  }
                }}
                className="w-20 bg-white/[0.05] border border-white/15 rounded px-1.5 py-0.5 text-[12px] text-white tabular-nums focus:outline-none focus:border-white/30"
              />
            </span>
          ) : (
            <button
              onClick={() => {
                setDraft(String(budget));
                setEditing(true);
              }}
              className="inline-flex items-center gap-1 text-white/75 hover:text-white tabular-nums cursor-pointer"
            >
              ${budget}
              <i className="fa-solid fa-pen text-[9px] text-white/40" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 mb-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div
            className={`text-2xl md:text-3xl font-normal tabular-nums tracking-tight ${tone.text}`}
          >
            {todayNet >= 0
              ? `+$${todayNet.toFixed(2)}`
              : `−$${todayLoss.toFixed(2)}`}
          </div>
          <div className="text-[11px] text-white/45">{message}</div>
        </div>
        <div className="text-[11px] text-white/55 tabular-nums shrink-0">
          {pct.toFixed(0)}% used
        </div>
      </div>

      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${tone.bar}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
