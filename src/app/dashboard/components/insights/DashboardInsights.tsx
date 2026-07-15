"use client";

import React, { useMemo, useState } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { TAG_KIND_BY_LABEL } from "@/app/data/tradeTags";
import { Trade } from "@/app/types/Trades";

// Three "what should I do differently today" widgets that complement
// the existing at-a-glance row. Same glass-card language as the rest of
// the redesigned surfaces (Statistics page, Time card, etc.).

const MIN_N_FOR_EDGE = 5;

const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";

const exitDate = (t: Trade): Date => new Date(t.dateClosed || t.dateBought);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function DashboardInsights({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  if (isLoading || !trades || trades.length === 0) return null;

  return (
    <>
      <DailyRiskBudget trades={trades} />
      <EdgeRanking trades={trades} />
      <MistakeLeaderboard trades={trades} />
    </>
  );
}

// ─── Daily risk budget ────────────────────────────────────────────────
function DailyRiskBudget({ trades }: { trades: Trade[] }) {
  const [budget, setBudget] = useLocalStorage<number>(
    "cuequill:daily-loss-budget",
    200,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(budget));

  const todayLoss = useMemo(() => {
    const today = startOfDay(new Date());
    const net = trades
      .filter(isClosed)
      .filter((t) => exitDate(t) >= today)
      .reduce((sum, t) => sum + tradeNetPL(t), 0);
    return Math.max(0, -net);
  }, [trades]);

  const todayNet = useMemo(() => {
    const today = startOfDay(new Date());
    return trades
      .filter(isClosed)
      .filter((t) => exitDate(t) >= today)
      .reduce((sum, t) => sum + tradeNetPL(t), 0);
  }, [trades]);

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

// ─── Strategy edge ranking ────────────────────────────────────────────
type StratEdge = {
  label: string;
  n: number;
  expectancy: number; // avg net P/L per trade
  winRate: number;
  total: number;
};

function EdgeRanking({ trades }: { trades: Trade[] }) {
  const ranked = useMemo<StratEdge[]>(() => {
    const groups = new Map<string, Trade[]>();
    for (const t of trades.filter(isClosed)) {
      const k = t.strategy ?? "-";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(t);
    }
    const rows: StratEdge[] = [];
    for (const [label, list] of groups) {
      if (list.length < MIN_N_FOR_EDGE) continue;
      const total = list.reduce((s, t) => s + tradeNetPL(t), 0);
      const wins = list.filter((t) => t.status === "WIN").length;
      rows.push({
        label,
        n: list.length,
        expectancy: total / list.length,
        winRate: (wins / list.length) * 100,
        total,
      });
    }
    rows.sort((a, b) => b.expectancy - a.expectancy);
    return rows;
  }, [trades]);

  if (ranked.length === 0) {
    return (
      <Section title="Strategy edge">
        <Empty
          text={`Need ≥${MIN_N_FOR_EDGE} closed trades per strategy to rank edge.`}
        />
      </Section>
    );
  }

  // If <=4, just show all; otherwise top 3 + bottom 3 with a divider.
  const showSplit = ranked.length > 4;
  const top = showSplit ? ranked.slice(0, 3) : ranked;
  const bot = showSplit ? ranked.slice(-3).reverse() : [];

  const maxExp = Math.max(...ranked.map((r) => Math.abs(r.expectancy)), 1);

  return (
    <Section title="Strategy edge">
      <div className="flex flex-col gap-2.5">
        {top.length > 0 && (
          <RankGroup label="Working" tone="good" rows={top} maxExp={maxExp} />
        )}
        {bot.length > 0 && (
          <RankGroup label="Leaking" tone="bad" rows={bot} maxExp={maxExp} />
        )}
      </div>
    </Section>
  );
}

function RankGroup({
  label,
  tone,
  rows,
  maxExp,
}: {
  label: string;
  tone: "good" | "bad";
  rows: StratEdge[];
  maxExp: number;
}) {
  const accent = tone === "good" ? "text-green-400" : "text-red-400";
  const bar = tone === "good" ? "bg-green-500/60" : "bg-red-500/60";
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`text-[10px] tracking-[0.08em] font-medium ${accent}`}>
        {label}
      </div>
      {rows.map((r) => {
        const width = (Math.abs(r.expectancy) / maxExp) * 100;
        return (
          <div
            key={r.label}
            className="flex items-center gap-2.5 text-[12px] md:text-[13px]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-white/85 truncate">{r.label}</span>
                <span
                  className={`${accent} tabular-nums font-normal whitespace-nowrap`}
                >
                  {r.expectancy >= 0 ? "+" : "−"}$
                  {Math.abs(r.expectancy).toFixed(2)}
                  <span className="text-white/35 font-normal">/trade</span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-0.5">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="text-[10px] text-white/40 tabular-nums mt-0.5">
                {r.n} trades · {r.winRate.toFixed(0)}% win ·{" "}
                {fmtMoneySignedCompact(r.total)} total
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mistake leaderboard ──────────────────────────────────────────────
type TagDrag = {
  label: string;
  count: number;
  total: number; // negative numbers = drag
};

function MistakeLeaderboard({ trades }: { trades: Trade[] }) {
  const top = useMemo<TagDrag[]>(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const t of trades.filter(isClosed)) {
      for (const tag of t.tags ?? []) {
        if (TAG_KIND_BY_LABEL[tag] !== "mistake") continue;
        const prev = map.get(tag) ?? { count: 0, total: 0 };
        prev.count += 1;
        prev.total += tradeNetPL(t);
        map.set(tag, prev);
      }
    }
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, count: v.count, total: v.total }))
      .sort((a, b) => a.total - b.total) // most negative first
      .slice(0, 3);
  }, [trades]);

  const totalDrag = top.reduce((s, r) => s + (r.total < 0 ? r.total : 0), 0);

  if (top.length === 0) {
    return (
      <Section title="Mistake leaderboard">
        <Empty text="No mistake tags on closed trades yet." />
      </Section>
    );
  }

  const maxDrag = Math.max(...top.map((r) => Math.abs(r.total)), 1);

  return (
    <Section title="Mistake leaderboard">
      <div className="flex flex-col gap-2.5">
        {totalDrag < 0 && (
          <div className="text-[11px] text-white/55">
            Top 3 tags account for{" "}
            <span className="text-red-400 font-normal tabular-nums">
              {fmtMoneySignedCompact(totalDrag)}
            </span>{" "}
            of drag.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {top.map((r, i) => {
            const width = (Math.abs(r.total) / maxDrag) * 100;
            return (
              <div key={r.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[11px] text-white/40 tabular-nums w-3">
                      {i + 1}
                    </span>
                    <span className="text-[12.5px] md:text-[13px] text-white/85 truncate">
                      {r.label}
                    </span>
                    <span className="text-[10px] text-white/40 tabular-nums">
                      × {r.count}
                    </span>
                  </div>
                  <span
                    className={`text-[12.5px] tabular-nums font-normal whitespace-nowrap ${
                      r.total < 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {r.total >= 0 ? "+" : "−"}${Math.abs(r.total).toFixed(0)}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      r.total < 0 ? "bg-red-500/60" : "bg-green-500/60"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ─── Shared section shell ─────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5 flex flex-col gap-3">
      <div className="text-sm md:text-base font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-[12px] text-white/40 text-center py-6">{text}</div>
  );
}
