"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import { Skeleton } from "@/components/Loaders";
import { useBalanceTimeline } from "@/hooks/useBalanceTimeline";
import { useTransactions } from "@/hooks/useTransactions";
import { fmtMoneyFull, fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from "recharts";

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";
const RANGES: Range[] = ["1M", "3M", "6M", "1Y", "ALL"];
const RANGE_DAYS: Record<Range, number | null> = {
  "1M": 30,
  "3M": 90,
  "6M": 182,
  "1Y": 365,
  ALL: null,
};

// "balance" = deposits/withdrawals + realized trade P/L; "adjusted" =
// trade P/L only, so you can see performance apart from cash flows.
type Mode = "balance" | "adjusted";

const todayStr = () => new Date().toISOString().split("T")[0];
const isoDay = (d: string) => new Date(d).toISOString().split("T")[0];

function Page() {
  const qc = useQueryClient();
  const { points, loading, hasData } = useBalanceTimeline();
  const { data: transactions = [] } = useTransactions();

  const [range, setRange] = useState<Range>("6M");
  const [mode, setMode] = useState<Mode>("balance");
  // Index of the point the cursor is over on the chart (null = not hovering).
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAW" | "ADJUST">(
    "DEPOSIT",
  );
  const [date, setDate] = useState(todayStr);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days == null) return points;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return points.filter((p) => p.date >= cutoffStr);
  }, [points, range]);

  const summary = useMemo(() => {
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    const inRange = filtered.length > 0 ? filtered : points;
    const first = inRange[0];
    const rawChange = last.balance - first.balance;
    const tradingChange = last.tradingCum - first.tradingCum;
    const netFlow = last.flowCum - first.flowCum;
    const change = mode === "adjusted" ? tradingChange : rawChange;
    const denom = Math.abs(first.balance);
    const pct = denom !== 0 ? (change / denom) * 100 : null;
    return { latest: last.balance, change, pct, netFlow, tradingChange };
  }, [points, filtered, mode]);

  const flows = useMemo(
    () =>
      transactions.map((t) => ({
        _id: t._id,
        date: isoDay(t.date),
        type: t.type,
        amount: t.amount,
      })),
    [transactions],
  );

  // Deposit/withdrawal markers snapped to the first charted day on/after
  // the flow, so they sit on whichever line is showing.
  const markers = useMemo(() => {
    if (filtered.length === 0) return [];
    const firstDay = filtered[0].date;
    const lastDay = filtered[filtered.length - 1].date;
    return flows
      .filter((f) => f.date >= firstDay && f.date <= lastDay)
      .map((f) => {
        const pt =
          filtered.find((p) => p.date >= f.date) ??
          filtered[filtered.length - 1];
        return {
          x: pt.date,
          y: mode === "adjusted" ? pt.tradingCum : pt.balance,
          type: f.type,
        };
      });
  }, [flows, filtered, mode]);

  const up = (summary?.change ?? 0) >= 0;
  const chartColor = up ? "#22c55e" : "#ef4444";
  const activeKey = mode === "adjusted" ? "tradingCum" : "balance";
  const seriesLabel = mode === "adjusted" ? "Trading P/L" : "Balance";
  const hasFlows = flows.length > 0;

  // The point under the cursor, if any — drives the headline balance and the
  // "not reached yet" dimming of everything after it.
  const hoverPoint =
    hoverIndex != null ? (filtered[hoverIndex] ?? null) : null;

  // Split the active series into "past" (up to the cursor, full strength) and
  // "future" (after the cursor, dimmed — "not reached yet"). They share the
  // hovered point so the line stays continuous. With no hover, everything is
  // "past" and the chart looks normal.
  const chartData = useMemo(
    () =>
      filtered.map((p, i) => {
        const val = p[activeKey];
        const past = hoverIndex == null || i <= hoverIndex ? val : null;
        const future = hoverIndex != null && i >= hoverIndex ? val : null;
        return { ...p, past, future };
      }),
    [filtered, activeKey, hoverIndex],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["transactions"] });

  const handleAdd = async () => {
    const amt = Number(amount);
    if (!date) {
      setStatus("Enter a date.");
      return;
    }

    // Reconcile: `amount` is the ACTUAL balance the broker shows as of `date`.
    // Record the signed difference vs. what we think the balance was then, so
    // the running balance snaps to the real figure.
    if (txType === "ADJUST") {
      if (!Number.isFinite(amt)) {
        setStatus("Enter your actual balance.");
        return;
      }
      let base = 0;
      for (const p of points) {
        if (p.date <= date) base = p.balance;
        else break;
      }
      const delta = Math.round((amt - base) * 100) / 100;
      if (Math.abs(delta) < 0.005) {
        setStatus("Balance already matches. Nothing to reconcile.");
        return;
      }
      setSaving(true);
      setStatus("");
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "ADJUST", amount: delta, date }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save");
        setAmount("");
        setStatus(
          `Reconciled — ${delta >= 0 ? "+" : "−"}${fmtMoneyFull(
            Math.abs(delta),
          )} adjustment recorded.`,
        );
        refresh();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Failed to save");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      setStatus("Enter a valid date and a positive amount.");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: txType, amount: amt, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setAmount("");
      setStatus(`${txType === "DEPOSIT" ? "Deposit" : "Withdrawal"} added.`);
      refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) refresh();
  };

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[1500px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
          }}
        />

        {/* Header */}
        <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight">
          Balance
        </h1>
        <p className="mt-1.5 text-[13px] md:text-sm text-white/55 max-w-xl">
          Your account balance over time.
        </p>

        {status && (
          <div className="mt-4 text-[12.5px] text-white/60">{status}</div>
        )}

        {loading ? (
          <div className="mt-8">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-9 md:h-11 w-48 md:w-64" delay={0.05} />
              </div>
              <Skeleton className="h-8 w-40 rounded-full" delay={0.1} />
            </div>
            <Skeleton className="mt-8 h-[280px] md:h-[340px] w-full" delay={0.15} />
          </div>
        ) : (
          <>
            {!hasData && <EmptyState />}
            {hasData && (
              <>
                {/* Summary + controls */}
                <div className="mt-8 flex items-end justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <div className="text-[11px] tracking-[0.1em] text-white/40 font-medium">
                      Balance
                    </div>
                    <div className="text-[32px] md:text-[40px] leading-none font-medium tracking-tight tabular-nums">
                      {fmtMoneyFull(
                        hoverPoint ? hoverPoint.balance : summary!.latest,
                      )}
                    </div>
                    {/* Reserve the height of the taller (non-hover) state so
                        the chart below doesn't jump when hovering collapses
                        this to a single date line. */}
                    <div
                      style={{
                        minHeight:
                          hasFlows && summary!.netFlow !== 0 ? 37 : 20,
                      }}
                    >
                    {hoverPoint ? (
                      // Hovering: show the date of the point under the cursor.
                      <div className="text-[13px] text-white/50 tabular-nums">
                        {new Date(hoverPoint.date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    ) : (
                      <>
                        <div
                          className={`text-[13px] font-medium tabular-nums ${
                            up ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {up ? "▲" : "▼"}{" "}
                          {fmtMoneySignedCompact(summary!.change)}
                          {summary!.pct != null && (
                            <span className="text-white/40 ml-1.5">
                              ({up ? "+" : "−"}
                              {Math.abs(summary!.pct).toFixed(1)}%){" "}
                              {mode === "adjusted" ? "from trading" : "over"}{" "}
                              {range}
                            </span>
                          )}
                        </div>
                        {hasFlows && summary!.netFlow !== 0 && (
                          <div className="text-[11.5px] text-white/40 tabular-nums">
                            {mode === "adjusted" ? (
                              <>
                                excl. net{" "}
                                {summary!.netFlow >= 0
                                  ? "deposits"
                                  : "withdrawals"}{" "}
                                {fmtMoneyFull(Math.abs(summary!.netFlow))}
                              </>
                            ) : (
                              <>
                                trading{" "}
                                {fmtMoneySignedCompact(summary!.tradingChange)}{" "}
                                · net{" "}
                                {summary!.netFlow >= 0
                                  ? "deposits"
                                  : "withdrawals"}{" "}
                                {fmtMoneyFull(Math.abs(summary!.netFlow))}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                      {RANGES.map((r) => (
                        <button
                          key={r}
                          onClick={() => setRange(r)}
                          className={`px-3 py-1 rounded-full text-[12px] font-medium transition cursor-pointer ${
                            range === r
                              ? "bg-white/10 text-white border border-white/15"
                              : "text-white/55 hover:text-white"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {hasFlows && (
                      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                        {(
                          [
                            ["balance", "Balance"],
                            ["adjusted", "Trading P/L"],
                          ] as [Mode, string][]
                        ).map(([m, label]) => (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-3 py-1 rounded-full text-[12px] font-medium transition cursor-pointer ${
                              mode === m
                                ? "bg-white/10 text-white border border-white/15"
                                : "text-white/55 hover:text-white"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 h-[280px] md:h-[340px]">
                  {filtered.length < 2 ? (
                    <div className="h-full flex items-center justify-center text-[13px] text-white/40 text-center">
                      Not enough activity in this range yet — log a deposit or
                      close a trade, or widen the range.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                        onMouseMove={(s) => {
                          const st = s as {
                            activeTooltipIndex?: number | string | null;
                            activeIndex?: number | string | null;
                            isTooltipActive?: boolean;
                          };
                          // recharts 3 reports the index as a string.
                          const raw = st.activeTooltipIndex ?? st.activeIndex;
                          const idx =
                            raw == null || raw === "" ? NaN : Number(raw);
                          setHoverIndex(
                            st.isTooltipActive &&
                              Number.isInteger(idx) &&
                              idx >= 0
                              ? idx
                              : null,
                          );
                        }}
                        onMouseLeave={() => setHoverIndex(null)}
                      >
                        <defs>
                          <linearGradient
                            id="balFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={chartColor}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor={chartColor}
                              stopOpacity={0}
                            />
                          </linearGradient>
                          {/* Faint fill for the not-yet-reached portion. */}
                          <linearGradient
                            id="balFillDim"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={chartColor}
                              stopOpacity={0.06}
                            />
                            <stop
                              offset="100%"
                              stopColor={chartColor}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "rgb(var(--fg-rgb) / 0.55)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={40}
                          tickFormatter={(d: string) =>
                            new Date(d).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          }
                        />
                        <YAxis
                          width={58}
                          tick={{ fill: "rgb(var(--fg-rgb) / 0.55)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                          tickFormatter={(v: number) => fmtMoneySignedCompact(v)}
                        />
                        {/* Reached so far — full strength. */}
                        <Area
                          type="monotone"
                          dataKey="past"
                          stroke={chartColor}
                          strokeWidth={2}
                          fill="url(#balFill)"
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                        {/* Not reached yet — dimmed. */}
                        <Area
                          type="monotone"
                          dataKey="future"
                          stroke={chartColor}
                          strokeOpacity={0.22}
                          strokeWidth={2}
                          fill="url(#balFillDim)"
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                        {markers.map((m, i) => {
                          // Markers after the cursor dim too.
                          const dimmed = hoverPoint != null && m.x > hoverPoint.date;
                          return (
                            <ReferenceDot
                              key={`${m.x}-${i}`}
                              x={m.x}
                              y={m.y}
                              r={4}
                              fill={
                                m.type === "DEPOSIT"
                                  ? "#2dd4bf"
                                  : m.type === "WITHDRAW"
                                    ? "#f59e0b"
                                    : "#38bdf8"
                              }
                              fillOpacity={dimmed ? 0.25 : 1}
                              stroke="var(--surface)"
                              strokeWidth={2}
                              strokeOpacity={dimmed ? 0.25 : 1}
                              ifOverflow="extendDomain"
                            />
                          );
                        })}
                        <ReTooltip
                          cursor={{ stroke: "var(--hairline)" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload || payload.length === 0)
                              return null;
                            const row = payload[0]?.payload as
                              | (typeof chartData)[number]
                              | undefined;
                            if (!row) return null;
                            return (
                              <div
                                style={{
                                  background: "var(--surface)",
                                  border: "1px solid var(--hairline)",
                                  borderRadius: 8,
                                  fontSize: 12,
                                  color: "var(--foreground)",
                                  padding: "6px 10px",
                                }}
                              >
                                <div style={{ opacity: 0.6 }}>
                                  {new Date(
                                    label as string,
                                  ).toLocaleDateString()}
                                </div>
                                <div style={{ fontWeight: 600 }}>
                                  {seriesLabel}: {fmtMoneyFull(row[activeKey])}
                                </div>
                              </div>
                            );
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {hasFlows && markers.length > 0 && (
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-white/45">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      Deposit
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Withdrawal
                    </span>
                    {flows.some((f) => f.type === "ADJUST") && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        Reconcile
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Log deposit / withdrawal — always available */}
            <div className="mt-8">
              <h2 className="text-[12px] font-medium text-white/40 mb-3">
                {txType === "ADJUST"
                  ? "Reconcile your balance"
                  : "Log a deposit or withdrawal"}
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 self-end">
                  {(
                    [
                      ["DEPOSIT", "Deposit"],
                      ["WITHDRAW", "Withdraw"],
                      ["ADJUST", "Reconcile"],
                    ] as ["DEPOSIT" | "WITHDRAW" | "ADJUST", string][]
                  ).map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTxType(t);
                        setStatus("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition cursor-pointer ${
                        txType === t
                          ? t === "DEPOSIT"
                            ? "bg-teal-500/20 text-teal-300"
                            : t === "WITHDRAW"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-sky-500/20 text-sky-300"
                          : "text-white/55 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-white/45">
                    {txType === "ADJUST" ? "As of" : "Date"}
                  </span>
                  <input
                    type="date"
                    value={date}
                    max={todayStr()}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[13px] text-white focus:border-white/25 focus:outline-none transition"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-white/45">
                    {txType === "ADJUST" ? "Actual balance" : "Amount"}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-36 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[13px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none transition tabular-nums"
                  />
                </label>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition text-[13px] font-medium ${
                    saving
                      ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                      : txType === "ADJUST"
                        ? "bg-sky-500/15 text-sky-300 border-sky-500/25 hover:bg-sky-500/25 cursor-pointer"
                        : "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      txType === "ADJUST" ? "fa-scale-balanced" : "fa-plus"
                    } text-[11px]`}
                  />
                  {saving
                    ? "Saving…"
                    : txType === "ADJUST"
                      ? "Reconcile"
                      : "Add"}
                </button>
              </div>
              {txType === "ADJUST" && (
                <p className="mt-2.5 text-[11.5px] text-white/45 leading-relaxed max-w-lg">
                  Enter the balance your broker shows as of that date. We&apos;ll
                  record the difference vs. your tracked balance as an adjustment
                  — covering fees, interest, or anything the journal missed.
                </p>
              )}
            </div>

            {/* Deposits / withdrawals history */}
            {flows.length > 0 && (
              <div className="mt-8">
                <h2 className="text-[12px] font-medium text-white/40 mb-3">
                  Transactions{" "}
                  <span className="text-white/25">({flows.length})</span>
                </h2>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
                  {[...flows]
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .map((f) => (
                      <div
                        key={f._id}
                        className="group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.025] transition-colors"
                      >
                        <div className="text-[13px] text-white/80 tabular-nums w-28">
                          {new Date(f.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <span
                          className={`text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full border ${
                            f.type === "DEPOSIT"
                              ? "bg-teal-500/10 text-teal-300 border-teal-500/25"
                              : f.type === "WITHDRAW"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                                : "bg-sky-500/10 text-sky-300 border-sky-500/25"
                          }`}
                        >
                          {f.type === "DEPOSIT"
                            ? "Deposit"
                            : f.type === "WITHDRAW"
                              ? "Withdraw"
                              : "Reconcile"}
                        </span>
                        {(() => {
                          // DEPOSIT is +, WITHDRAW is −, ADJUST follows its sign.
                          const positive =
                            f.type === "DEPOSIT" ||
                            (f.type === "ADJUST" && f.amount >= 0);
                          return (
                            <div
                              className={`flex-1 text-right text-[14px] font-medium tabular-nums ${
                                positive ? "text-green-300" : "text-red-300"
                              }`}
                            >
                              {positive ? "+" : "−"}
                              {fmtMoneyFull(Math.abs(f.amount))}
                            </div>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => handleDelete(f._id)}
                          aria-label="Delete"
                          title="Delete this entry"
                          className="shrink-0 w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/45 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition flex items-center justify-center cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                        >
                          <i className="fa-solid fa-trash-can text-[11px]" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 md:p-12 text-center flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl border border-teal-500/25 bg-teal-500/10 text-teal-300 flex items-center justify-center">
        <i className="fa-solid fa-wallet text-[18px]" />
      </div>
      <div className="max-w-md">
        <h2 className="text-[17px] font-semibold">Start tracking your balance</h2>
        <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
          Log your first deposit below to set a starting balance. From there
          your balance moves with every closed trade in your journal, and with
          any withdrawals or further deposits you record.
        </p>
      </div>
    </div>
  );
}

export default withAuth(Page);
