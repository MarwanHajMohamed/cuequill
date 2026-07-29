"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import {
  useBalanceSnapshots,
  type BalanceSnapshot,
} from "@/hooks/useBalanceSnapshots";
import { useTransactions } from "@/hooks/useTransactions";
import { fmtCurrency } from "@/lib/helpers/fmt";
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
// "balance" = raw account value; "adjusted" neutralises deposits &
// withdrawals so the line reflects trading performance only.
type Mode = "balance" | "adjusted";
const RANGES: Range[] = ["1M", "3M", "6M", "1Y", "ALL"];
const RANGE_DAYS: Record<Range, number | null> = {
  "1M": 30,
  "3M": 90,
  "6M": 182,
  "1Y": 365,
  ALL: null,
};

const todayStr = () => new Date().toISOString().split("T")[0];

function Page() {
  const qc = useQueryClient();
  const { data: snapshots, isLoading } = useBalanceSnapshots();
  const { data: transactions } = useTransactions();

  const [range, setRange] = useState<Range>("6M");
  const [mode, setMode] = useState<Mode>("balance");
  const [date, setDate] = useState(todayStr);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState("");

  const isoDay = (d: string) => new Date(d).toISOString().split("T")[0];

  // Deposits (+) and withdrawals (−) as a signed cash flow, sorted by day.
  const flows = useMemo(() => {
    return (transactions ?? [])
      .filter((t) => t.type === "DEPOSIT" || t.type === "WITHDRAW")
      .map((t) => ({
        date: isoDay(t.date),
        signed: t.type === "DEPOSIT" ? t.amount : -t.amount,
        type: t.type as "DEPOSIT" | "WITHDRAW",
        amount: t.amount,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [transactions]);

  // Every snapshot annotated with the cumulative net cash flow up to and
  // including its day. `adjusted` (filled in per-range below) subtracts the
  // net flow that landed within the window so the curve shows trading only.
  const series = useMemo(() => {
    if (!snapshots) return [];
    let fi = 0;
    let cum = 0;
    return snapshots.map((s) => {
      while (fi < flows.length && flows[fi].date <= s.date) {
        cum += flows[fi].signed;
        fi++;
      }
      return { date: s.date, balance: s.balance, cumFlow: cum };
    });
  }, [snapshots, flows]);

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days == null) return series;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return series.filter((s) => s.date >= cutoffStr);
  }, [series, range]);

  // Chart data for the active window. `adjusted` re-bases each point by the
  // net flow since the window's first point, so deposits/withdrawals don't
  // show up as jumps in the trading-performance view.
  const chartData = useMemo(() => {
    if (filtered.length === 0) return [];
    const baseFlow = filtered[0].cumFlow;
    return filtered.map((p) => ({
      date: p.date,
      balance: p.balance,
      adjusted: p.balance - (p.cumFlow - baseFlow),
    }));
  }, [filtered]);

  // Deposit/withdrawal markers, snapped to the first charted day on/after
  // the flow so they sit on the line in either view.
  const markers = useMemo(() => {
    if (chartData.length === 0) return [];
    const first = chartData[0].date;
    const last = chartData[chartData.length - 1].date;
    return flows
      .filter((f) => f.date >= first && f.date <= last)
      .map((f) => {
        const pt =
          chartData.find((p) => p.date >= f.date) ??
          chartData[chartData.length - 1];
        return {
          x: pt.date,
          y: mode === "adjusted" ? pt.adjusted : pt.balance,
          type: f.type,
          amount: f.amount,
        };
      });
  }, [flows, chartData, mode]);

  const summary = useMemo(() => {
    if (!snapshots || snapshots.length === 0 || series.length === 0)
      return null;
    const last = series[series.length - 1];
    const inRange = filtered.length > 0 ? filtered : series;
    const first = inRange[0];
    const rawChange = last.balance - first.balance;
    const netFlow = last.cumFlow - first.cumFlow; // flows within the window
    const tradingChange = rawChange - netFlow;
    const change = mode === "adjusted" ? tradingChange : rawChange;
    const denom = Math.abs(first.balance);
    const pct = denom !== 0 ? (change / denom) * 100 : null;
    return {
      latest: last.balance,
      change,
      pct,
      netFlow,
      tradingChange,
      currency: snapshots[snapshots.length - 1].currency,
    };
  }, [snapshots, series, filtered, mode]);

  const hasData = !!snapshots && snapshots.length > 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["balanceSnapshots"] });

  const handleAdd = async () => {
    const bal = Number(amount);
    if (!Number.isFinite(bal) || !date) {
      setStatus("Enter a valid date and amount.");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          balance: bal,
          currency: currency || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setAmount("");
      setStatus("Snapshot saved.");
      refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setStatus("Syncing balance from IBKR…");
    try {
      const res = await fetch("/api/balance/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setStatus(
        `Synced — ${data.fetched} day${data.fetched === 1 ? "" : "s"} of balance pulled.`,
      );
      refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic: drop from cache, then confirm with the server.
    const prev = snapshots;
    qc.setQueryData<BalanceSnapshot[]>(["balanceSnapshots"], (old) =>
      (old ?? []).filter((s) => s._id !== id),
    );
    const res = await fetch(`/api/balance/${id}`, { method: "DELETE" });
    if (!res.ok) qc.setQueryData(["balanceSnapshots"], prev); // roll back
    else refresh();
  };

  const up = (summary?.change ?? 0) >= 0;
  const chartColor = up ? "#22c55e" : "#ef4444";
  const cur = summary?.currency;
  const activeKey = mode === "adjusted" ? "adjusted" : "balance";
  const seriesLabel = mode === "adjusted" ? "Trading P/L" : "Balance";
  const hasFlows = flows.length > 0;

  return (
    <div className="w-full flex justify-center min-h-screen pb-24">
      <div className="w-full max-w-[900px] px-5 md:px-8 pt-24 md:pt-12 flex flex-col">
        {/* Aurora wash to match the rest of the app */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
          }}
        />

        <header className="pb-6 border-b border-white/10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">Balance</h1>
            <p className="text-[13.5px] text-white/50 mt-1.5 leading-relaxed max-w-lg">
              Your account value over time — pulled from IBKR each night, plus
              any snapshots you log by hand.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
              syncing
                ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                : "bg-indigo-500/15 text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/25 cursor-pointer"
            }`}
          >
            <i
              className={`fa-solid fa-rotate text-[11px] ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing…" : "Sync from IBKR"}
          </button>
        </header>

        {status && (
          <div className="mt-4 text-[12.5px] text-white/60">{status}</div>
        )}

        {isLoading ? (
          <div className="mt-10 text-[13px] text-white/40">Loading balance…</div>
        ) : (
          <>
            {!hasData && <EmptyState />}
            {hasData && (
              <>
            {/* Summary + range */}
            <div className="mt-8 flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <div className="text-[11px] tracking-[0.1em] text-white/40 font-medium uppercase">
                  Current balance
                </div>
                <div className="text-[32px] md:text-[40px] leading-none font-medium tracking-tight tabular-nums">
                  {fmtCurrency(summary!.latest, cur)}
                </div>
                <div
                  className={`text-[13px] font-medium tabular-nums ${
                    up ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {up ? "▲" : "▼"} {up ? "+" : "−"}
                  {fmtCurrency(Math.abs(summary!.change), cur)}
                  {summary!.pct != null && (
                    <span className="text-white/40 ml-1.5">
                      ({up ? "+" : "−"}
                      {Math.abs(summary!.pct).toFixed(1)}%){" "}
                      {mode === "adjusted" ? "from trading" : "over"} {range}
                    </span>
                  )}
                </div>
                {/* When cash moved in/out of the window, show it so the raw
                    change isn't mistaken for trading performance. */}
                {hasFlows && summary!.netFlow !== 0 && (
                  <div className="text-[11.5px] text-white/40 tabular-nums">
                    {mode === "adjusted" ? (
                      <>
                        excl. net{" "}
                        {summary!.netFlow >= 0 ? "deposits" : "withdrawals"}{" "}
                        {fmtCurrency(Math.abs(summary!.netFlow), cur)}
                      </>
                    ) : (
                      <>
                        incl. net{" "}
                        {summary!.netFlow >= 0 ? "deposits" : "withdrawals"}{" "}
                        {fmtCurrency(Math.abs(summary!.netFlow), cur)} · trading{" "}
                        {summary!.tradingChange >= 0 ? "+" : "−"}
                        {fmtCurrency(Math.abs(summary!.tradingChange), cur)}
                      </>
                    )}
                  </div>
                )}
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
                {/* Balance vs trading-only (deposits/withdrawals removed).
                    Only worth showing once there are cash flows to remove. */}
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
              {chartData.length < 2 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-white/40 text-center">
                  Not enough points in this range yet — add more snapshots or
                  widen the range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
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
                      width={54}
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => fmtCurrency(v, cur, true)}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeKey}
                      stroke={chartColor}
                      strokeWidth={2}
                      fill="url(#balFill)"
                    />
                    {/* Deposit (teal) / withdrawal (amber) markers on the line. */}
                    {markers.map((m, i) => (
                      <ReferenceDot
                        key={`${m.x}-${i}`}
                        x={m.x}
                        y={m.y}
                        r={4}
                        fill={m.type === "DEPOSIT" ? "#2dd4bf" : "#f59e0b"}
                        stroke="var(--surface)"
                        strokeWidth={2}
                        ifOverflow="extendDomain"
                      />
                    ))}
                    <ReTooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--hairline)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--foreground)",
                      }}
                      labelFormatter={(d) =>
                        new Date(d as string).toLocaleDateString()
                      }
                      formatter={(v: number) => [
                        fmtCurrency(v, cur),
                        seriesLabel,
                      ]}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Marker legend — only when there are flows on the chart. */}
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
              </div>
            )}
              </>
            )}

            {/* Add manual snapshot — always available, even before there's
                any history to chart. */}
            <div className="mt-8">
              <h2 className="text-[12px] font-medium text-white/40 mb-3">
                Add a snapshot
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-white/45">Date</span>
                  <input
                    type="date"
                    value={date}
                    max={todayStr()}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[13px] text-white focus:border-white/25 focus:outline-none transition"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-white/45">Balance</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-36 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[13px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none transition tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-white/45">Currency</span>
                  <input
                    type="text"
                    placeholder={cur ?? "USD"}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    maxLength={3}
                    className="w-20 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[13px] text-white uppercase placeholder:text-white/40 placeholder:normal-case focus:border-white/25 focus:outline-none transition"
                  />
                </label>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition text-[13px] font-medium ${
                    saving
                      ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                      : "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                  }`}
                >
                  <i className="fa-solid fa-plus text-[11px]" />
                  {saving ? "Saving…" : "Add"}
                </button>
              </div>
            </div>

            {/* History */}
            {hasData && (
              <div className="mt-8">
                <h2 className="text-[12px] font-medium text-white/40 mb-3">
                  History{" "}
                  <span className="text-white/25">({snapshots!.length})</span>
                </h2>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
                  {[...snapshots!].reverse().map((s) => (
                    <HistoryRow key={s._id} s={s} onDelete={handleDelete} />
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

function HistoryRow({
  s,
  onDelete,
}: {
  s: BalanceSnapshot;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.025] transition-colors">
      <div className="text-[13px] text-white/80 tabular-nums w-28">
        {new Date(s.date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
      <span
        className={`text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full border ${
          s.source === "ibkr"
            ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25"
            : "bg-white/[0.04] text-white/50 border-white/15"
        }`}
      >
        {s.source === "ibkr" ? "IBKR" : "Manual"}
      </span>
      <div className="flex-1 text-right text-[14px] font-medium text-white tabular-nums">
        {fmtCurrency(s.balance, s.currency)}
      </div>
      <button
        type="button"
        onClick={() => onDelete(s._id)}
        aria-label="Delete snapshot"
        title="Delete this snapshot"
        className="shrink-0 w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/45 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition flex items-center justify-center cursor-pointer md:opacity-0 md:group-hover:opacity-100"
      >
        <i className="fa-solid fa-trash-can text-[11px]" />
      </button>
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
          Pull your daily account value automatically from Interactive Brokers,
          or log snapshots by hand. Add your first snapshot below, or connect a
          balance Flex query in{" "}
          <Link
            href="/settings"
            className="text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline"
          >
            settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default withAuth(Page);
