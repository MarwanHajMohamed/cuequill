"use client";

import React, { useMemo, useState } from "react";
import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  useBacktestPrices,
  useSavedBacktests,
  useSaveBacktest,
  useDeleteBacktest,
  useParseStrategy,
} from "@/hooks/useBacktest";
import { runBacktest } from "@/lib/backtest/engine";
import {
  DEFAULT_CONFIG,
  COMPARATOR_LABEL,
  PATTERN_META,
  DEFAULT_PATTERN_N,
  TEMPLATES,
  isPattern,
  conditionText,
  type BacktestConfig,
  type Condition,
  type Comparator,
  type Indicator,
  type PatternKind,
} from "@/lib/backtest/types";
import { fmtMoneyCompact, fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
} from "recharts";

const inputCls =
  "bg-white/[0.05] border border-white/15 rounded-lg px-2.5 py-1.5 text-[13px] text-white focus:outline-none focus:border-white/30";
const selectCls = `${inputCls} cursor-pointer`;

// ── Indicator picker ──────────────────────────────────────────────────
function defaultForKind(kind: string): Indicator {
  switch (kind) {
    case "sma":
      return { kind: "sma", period: 20 };
    case "ema":
      return { kind: "ema", period: 20 };
    case "rsi":
      return { kind: "rsi", period: 14 };
    case "value":
      return { kind: "value", value: 30 };
    default:
      return { kind: "price", field: "close" };
  }
}

function IndicatorPicker({
  value,
  onChange,
}: {
  value: Indicator;
  onChange: (v: Indicator) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        className={selectCls}
        value={value.kind}
        onChange={(e) => onChange(defaultForKind(e.target.value))}
      >
        <option value="price">Price</option>
        <option value="sma">SMA</option>
        <option value="ema">EMA</option>
        <option value="rsi">RSI</option>
        <option value="value">Value</option>
      </select>
      {(value.kind === "sma" ||
        value.kind === "ema" ||
        value.kind === "rsi") && (
        <input
          type="number"
          min={1}
          className={`${inputCls} w-16 tabular-nums`}
          value={value.period}
          onChange={(e) =>
            onChange({
              ...value,
              period: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      )}
      {value.kind === "value" && (
        <input
          type="number"
          className={`${inputCls} w-20 tabular-nums`}
          value={value.value}
          onChange={(e) =>
            onChange({ kind: "value", value: Number(e.target.value) || 0 })
          }
        />
      )}
    </span>
  );
}

const COMPARE_DEFAULT: Condition = {
  left: { kind: "price", field: "close" },
  op: "crossesAbove",
  right: { kind: "sma", period: 50 },
};
const PATTERN_DEFAULT: Condition = { type: "pattern", pattern: "redCandle" };

function ConditionList({
  title,
  join,
  conditions,
  onChange,
}: {
  title: string;
  join: string;
  conditions: Condition[];
  onChange: (c: Condition[]) => void;
}) {
  const replaceAt = (i: number, next: Condition) =>
    onChange(conditions.map((c, idx) => (idx === i ? next : c)));
  const remove = (i: number) =>
    onChange(conditions.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-wider text-white/45 font-medium">
        {title}
      </div>
      {conditions.length === 0 && (
        <div className="text-[12px] text-white/40 italic">
          No conditions — this side won&apos;t fire.
        </div>
      )}
      {conditions.map((c, i) => {
        const pattern = isPattern(c);
        return (
          <div key={i} className="flex flex-col gap-1.5">
            {i > 0 && (
              <span className="text-[10px] uppercase tracking-wider text-teal-300/70">
                {join}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Comparison vs candle pattern */}
              <select
                className={selectCls}
                value={pattern ? "pattern" : "compare"}
                onChange={(e) =>
                  replaceAt(
                    i,
                    e.target.value === "pattern"
                      ? PATTERN_DEFAULT
                      : COMPARE_DEFAULT,
                  )
                }
              >
                <option value="compare">Indicator</option>
                <option value="pattern">Candle pattern</option>
              </select>

              {pattern ? (
                <>
                  <select
                    className={selectCls}
                    value={c.pattern}
                    onChange={(e) =>
                      replaceAt(i, {
                        type: "pattern",
                        pattern: e.target.value as PatternKind,
                        n: DEFAULT_PATTERN_N[e.target.value as PatternKind],
                      })
                    }
                  >
                    {(Object.keys(PATTERN_META) as PatternKind[]).map((p) => (
                      <option key={p} value={p}>
                        {PATTERN_META[p].label}
                      </option>
                    ))}
                  </select>
                  {PATTERN_META[c.pattern].hasN && (
                    <span className="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        className={`${inputCls} w-16 tabular-nums`}
                        value={c.n ?? DEFAULT_PATTERN_N[c.pattern] ?? 1}
                        onChange={(e) =>
                          replaceAt(i, {
                            type: "pattern",
                            pattern: c.pattern,
                            n: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                      <span className="text-[10px] text-white/40">
                        {PATTERN_META[c.pattern].nLabel}
                      </span>
                    </span>
                  )}
                </>
              ) : (
                <>
                  <IndicatorPicker
                    value={c.left}
                    onChange={(left) => replaceAt(i, { ...c, left })}
                  />
                  <select
                    className={selectCls}
                    value={c.op}
                    onChange={(e) =>
                      replaceAt(i, { ...c, op: e.target.value as Comparator })
                    }
                  >
                    {(Object.keys(COMPARATOR_LABEL) as Comparator[]).map(
                      (op) => (
                        <option key={op} value={op}>
                          {COMPARATOR_LABEL[op]}
                        </option>
                      ),
                    )}
                  </select>
                  <IndicatorPicker
                    value={c.right}
                    onChange={(right) => replaceAt(i, { ...c, right })}
                  />
                </>
              )}
              <button
                onClick={() => remove(i)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                aria-label="Remove condition"
              >
                <i className="fa-solid fa-xmark text-[13px]" />
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange([...conditions, COMPARE_DEFAULT])}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] transition cursor-pointer"
        >
          <i className="fa-solid fa-plus text-[10px]" /> Indicator
        </button>
        <button
          onClick={() => onChange([...conditions, PATTERN_DEFAULT])}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] transition cursor-pointer"
        >
          <i className="fa-solid fa-plus text-[10px]" /> Pattern
        </button>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-white";
  return (
    <div className="border border-[var(--hairline)] rounded-lg p-3 flex flex-col gap-1 min-w-0 basis-[130px] grow">
      <div className="text-[10px] md:text-xs text-white/50 tracking-wide truncate">
        {label}
      </div>
      <div
        className={`text-base md:text-xl font-normal tabular-nums truncate ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

const CARD =
  "rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5";

const AI_EXAMPLES = [
  "Buy the first red candle after 3 green ones, sell on the next green candle with a 3% stop.",
  "Go long SPY when the 50-day SMA crosses above the 200-day, exit when it crosses back below.",
  "Short QQQ when RSI(14) goes above 70, cover when it drops below 50 or after 10 days.",
];

// Plain-English → structured config. The result is applied to the form so
// the user can review and tweak before running.
function AiStrategyBuilder({
  onBuilt,
}: {
  onBuilt: (c: BacktestConfig) => void;
}) {
  const [text, setText] = useState("");
  const parse = useParseStrategy();

  const build = async () => {
    const t = text.trim();
    if (!t) return;
    const config = await parse.mutateAsync(t);
    onBuilt(config);
  };

  return (
    <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.04] p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-wand-magic-sparkles text-teal-300 text-[13px]" />
        <span className="text-[13px] font-semibold text-white/85">
          Describe your strategy
        </span>
      </div>
      <p className="text-[11.5px] text-white/45 leading-relaxed">
        Write your rules in plain English and let AI build the setup. Review
        and tweak it below, then run.
      </p>
      <textarea
        className={`${inputCls} w-full resize-y min-h-[72px] leading-relaxed`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Buy the first red candle after 3 green ones on SPY, sell on the next green candle with a 3% stop."
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") build();
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        {AI_EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setText(ex)}
            className="text-[10.5px] text-white/50 hover:text-teal-200 border border-white/10 hover:border-teal-400/30 rounded-full px-2 py-0.5 transition cursor-pointer max-w-full truncate"
            title={ex}
          >
            {ex.length > 42 ? ex.slice(0, 40) + "…" : ex}
          </button>
        ))}
      </div>
      <button
        onClick={build}
        disabled={parse.isPending || !text.trim()}
        className="inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold px-3 py-2 rounded-lg bg-teal-500/90 text-white hover:bg-teal-400 transition cursor-pointer disabled:opacity-50"
      >
        {parse.isPending ? (
          <>
            <i className="fa-solid fa-spinner fa-spin text-[11px]" /> Building…
          </>
        ) : (
          <>
            <i className="fa-solid fa-wand-magic-sparkles text-[11px]" /> Build
            with AI
          </>
        )}
      </button>
      {parse.error && (
        <div className="text-[11.5px] text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-2.5 py-1.5">
          {(parse.error as Error).message}
        </div>
      )}
    </div>
  );
}

function Page() {
  const [config, setConfig] = useLocalStorage<BacktestConfig>(
    "cuequill:backtest-config",
    DEFAULT_CONFIG,
  );
  const set = (patch: Partial<BacktestConfig>) =>
    setConfig({ ...config, ...patch });

  // The symbol we've actually loaded bars for (set on Run). Rules changes
  // recompute instantly against the loaded bars; a symbol change needs Run.
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const { data: bars, isFetching, error } = useBacktestPrices(activeSymbol);

  const result = useMemo(
    () => (bars && bars.length ? runBacktest(bars, config) : null),
    [bars, config],
  );

  // Buy & hold benchmark over the same window, for the equity chart.
  const chartData = useMemo(() => {
    if (!result || !bars) return [];
    const inRange = bars.filter(
      (b) => b.date >= config.from && b.date <= config.to,
    );
    const base = inRange.length ? inRange[0].close : 0;
    const bhByDate = new Map(
      inRange.map((b) => [
        b.date,
        base > 0
          ? (config.initialCapital * b.close) / base
          : config.initialCapital,
      ]),
    );
    return result.equity.map((p) => ({
      date: p.date,
      strategy: p.value,
      buyHold: bhByDate.get(p.date) ?? null,
    }));
  }, [result, bars, config.from, config.to, config.initialCapital]);

  // Saved backtests.
  const { data: saved } = useSavedBacktests();
  const saveMut = useSaveBacktest();
  const delMut = useDeleteBacktest();
  const [loadedId, setLoadedId] = useState<string>("");

  const run = () => setActiveSymbol(config.symbol.trim().toUpperCase());

  const saveCurrent = async () => {
    const name = window.prompt(
      "Name this backtest",
      config.symbol + " strategy",
    );
    if (!name) return;
    await saveMut.mutateAsync({ name, config });
  };
  const updateCurrent = async () => {
    if (!loadedId) return;
    await saveMut.mutateAsync({ id: loadedId, name: currentName(), config });
  };
  const currentName = () =>
    saved?.find((s) => s.id === loadedId)?.name ?? config.symbol;
  const loadSaved = (id: string) => {
    const s = saved?.find((x) => x.id === id);
    if (!s) return;
    setLoadedId(id);
    setConfig(s.config);
    setActiveSymbol(s.config.symbol.trim().toUpperCase());
  };

  const s = result?.stats;

  return (
    <div className="w-full max-w-[1500px] mx-auto md:mx-0 px-5 md:px-10 mt-24 md:mt-10 pb-16 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Strategy backtester
            </span>
          </h1>
          <p className="text-[13px] text-white/45 mt-1">
            Test rule-based strategies on historical daily prices (US stocks
            &amp; ETFs). Data via Yahoo Finance.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saved && saved.length > 0 && (
            <select
              className={selectCls}
              value={loadedId}
              onChange={(e) => loadSaved(e.target.value)}
            >
              <option value="">Load saved…</option>
              {saved.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.name}
                </option>
              ))}
            </select>
          )}
          {loadedId && (
            <button
              onClick={() => {
                delMut.mutate(loadedId);
                setLoadedId("");
              }}
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
            >
              <i className="fa-solid fa-trash text-[11px]" /> Delete
            </button>
          )}
          <button
            onClick={loadedId ? updateCurrent : saveCurrent}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] transition cursor-pointer disabled:opacity-50"
          >
            <i className="fa-solid fa-floppy-disk text-[11px]" />
            {loadedId ? "Update" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-6 items-start">
        {/* ── Config ── */}
        <div className={`${CARD} flex flex-col gap-5`}>
          {/* Describe in plain English — AI builds the config below. */}
          <AiStrategyBuilder
            onBuilt={(c) => {
              setConfig(c);
              setLoadedId("");
              setActiveSymbol(null);
            }}
          />

          {/* Templates — start from a working example, then tweak. */}
          <label className="flex flex-col gap-1 text-[11px] text-white/50">
            Start from a template
            <select
              className={selectCls}
              value=""
              onChange={(e) => {
                const t = TEMPLATES.find((x) => x.name === e.target.value);
                if (t) {
                  setConfig(structuredClone(t.config));
                  setLoadedId("");
                  setActiveSymbol(t.config.symbol.trim().toUpperCase());
                }
              }}
            >
              <option value="">Choose a strategy…</option>
              {TEMPLATES.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Symbol
              <input
                className={`${inputCls} uppercase`}
                value={config.symbol}
                onChange={(e) => set({ symbol: e.target.value.toUpperCase() })}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="SPY"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Direction
              <select
                className={selectCls}
                value={config.direction}
                onChange={(e) =>
                  set({ direction: e.target.value as "long" | "short" })
                }
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              From
              <input
                type="date"
                className={inputCls}
                value={config.from}
                onChange={(e) => set({ from: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              To
              <input
                type="date"
                className={inputCls}
                value={config.to}
                onChange={(e) => set({ to: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Capital ($)
              <input
                type="number"
                className={`${inputCls} tabular-nums`}
                value={config.initialCapital}
                onChange={(e) =>
                  set({ initialCapital: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Position size (% equity)
              <input
                type="number"
                min={1}
                max={100}
                className={`${inputCls} tabular-nums`}
                value={config.positionPct}
                onChange={(e) =>
                  set({ positionPct: Number(e.target.value) || 0 })
                }
              />
            </label>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <ConditionList
              title="Entry when"
              join="and"
              conditions={config.entry}
              onChange={(entry) => set({ entry })}
            />
          </div>
          <div className="border-t border-white/[0.06] pt-4">
            <ConditionList
              title="Exit when"
              join="or"
              conditions={config.exit}
              onChange={(exit) => set({ exit })}
            />
          </div>

          <div className="border-t border-white/[0.06] pt-4 grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Stop loss %
              <input
                type="number"
                className={`${inputCls} tabular-nums`}
                value={config.stopLossPct ?? ""}
                placeholder="—"
                onChange={(e) =>
                  set({
                    stopLossPct: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Take profit %
              <input
                type="number"
                className={`${inputCls} tabular-nums`}
                value={config.takeProfitPct ?? ""}
                placeholder="—"
                onChange={(e) =>
                  set({
                    takeProfitPct: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-white/50">
              Max bars held
              <input
                type="number"
                className={`${inputCls} tabular-nums`}
                value={config.maxBars ?? ""}
                placeholder="—"
                onChange={(e) =>
                  set({
                    maxBars: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
          </div>

          <button
            onClick={run}
            disabled={isFetching || !config.symbol.trim()}
            className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-xl bg-teal-500/90 text-white hover:bg-teal-400 transition cursor-pointer disabled:opacity-50"
          >
            {isFetching ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-[12px]" />{" "}
                Loading…
              </>
            ) : (
              <>
                <i className="fa-solid fa-play text-[11px]" /> Run backtest
              </>
            )}
          </button>
          {error && (
            <div className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">
              {(error as Error).message}
            </div>
          )}
        </div>

        {/* ── Results ── */}
        <div className="flex flex-col gap-6 min-w-0">
          {!result && (
            <div className={`${CARD} text-center text-white/40 text-sm py-20`}>
              Set your rules and hit{" "}
              <span className="text-white/70">Run backtest</span> to see
              results.
            </div>
          )}

          {s && (
            <>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <Kpi
                  label="Total return"
                  value={`${s.returnPct >= 0 ? "+" : ""}${s.returnPct.toFixed(1)}%`}
                  tone={s.returnPct >= 0 ? "good" : "bad"}
                />
                <Kpi
                  label="Net P/L"
                  value={fmtMoneySignedCompact(s.netPL)}
                  tone={s.netPL >= 0 ? "good" : "bad"}
                />
                <Kpi label="Trades" value={`${s.trades}`} />
                <Kpi label="Win rate" value={`${s.winRate.toFixed(0)}%`} />
                <Kpi
                  label="Profit factor"
                  value={
                    s.profitFactor == null ? "∞" : s.profitFactor.toFixed(2)
                  }
                  tone={
                    s.profitFactor == null || s.profitFactor >= 1
                      ? "good"
                      : "bad"
                  }
                />
                <Kpi
                  label="Max drawdown"
                  value={`−${s.maxDrawdownPct.toFixed(1)}%`}
                  tone="bad"
                />
                <Kpi
                  label="Expectancy"
                  value={fmtMoneySignedCompact(s.expectancy)}
                />
                <Kpi label="Exposure" value={`${s.exposurePct.toFixed(0)}%`} />
              </div>

              {chartData.length >= 2 && (
                <div className={`${CARD} flex flex-col gap-3`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm md:text-base font-semibold">
                      Equity curve
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-white/50">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded bg-teal-400" />{" "}
                        Strategy
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded bg-white/40" /> Buy
                        &amp; hold
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--hairline)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "var(--foreground)" }}
                          minTickGap={48}
                          tickFormatter={(d: string) => d.slice(0, 7)}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "var(--foreground)" }}
                          width={54}
                          tickFormatter={(v: number) => fmtMoneyCompact(v)}
                          domain={["auto", "auto"]}
                        />
                        <ReTooltip
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--hairline)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--foreground)",
                          }}
                          formatter={(v: number, n: string) => [
                            fmtMoneyCompact(v),
                            n === "strategy" ? "Strategy" : "Buy & hold",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="buyHold"
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="strategy"
                          stroke="#2dd4bf"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className={`${CARD} flex flex-col gap-3`}>
                <div className="text-sm md:text-base font-semibold">
                  Trades{" "}
                  <span className="text-white/40 font-normal text-xs">
                    ({result!.trades.length})
                  </span>
                </div>
                {result!.trades.length === 0 ? (
                  <div className="text-[13px] text-white/40 py-6 text-center">
                    No trades were triggered in this window.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto chat-scroll -mx-1 px-1">
                    <table className="w-full text-[12.5px] min-w-[560px]">
                      <thead className="text-white/45 text-[11px] uppercase tracking-wide">
                        <tr className="text-left">
                          <th className="py-1.5 pr-3 font-medium">In</th>
                          <th className="py-1.5 pr-3 font-medium">Out</th>
                          <th className="py-1.5 pr-3 font-medium">Entry</th>
                          <th className="py-1.5 pr-3 font-medium">Exit</th>
                          <th className="py-1.5 pr-3 font-medium">Return</th>
                          <th className="py-1.5 pr-3 font-medium">P/L</th>
                          <th className="py-1.5 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {result!.trades.map((t, i) => (
                          <tr key={i} className="tabular-nums">
                            <td className="py-1.5 pr-3 text-white/70">
                              {t.entryDate}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              {t.exitDate}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              ${t.entryPrice.toFixed(2)}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              ${t.exitPrice.toFixed(2)}
                            </td>
                            <td
                              className={`py-1.5 pr-3 ${
                                t.returnPct >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {t.returnPct >= 0 ? "+" : ""}
                              {t.returnPct.toFixed(1)}%
                            </td>
                            <td
                              className={`py-1.5 pr-3 ${
                                t.pnl >= 0 ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {fmtMoneySignedCompact(t.pnl)}
                            </td>
                            <td className="py-1.5 text-white/45 capitalize">
                              {t.exitReason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Plain-English rule recap */}
              <div className="text-[11.5px] text-white/40 leading-relaxed">
                {config.direction === "long" ? "Buy" : "Short"} {config.symbol}{" "}
                when {config.entry.map(conditionText).join(" and ") || "…"};
                exit when {config.exit.map(conditionText).join(" or ") || "…"}
                {config.stopLossPct ? `, stop −${config.stopLossPct}%` : ""}
                {config.takeProfitPct
                  ? `, target +${config.takeProfitPct}%`
                  : ""}
                {config.maxBars ? `, or after ${config.maxBars} bars` : ""}.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GatedPage() {
  return (
    <ProGate
      feature="Strategy backtester"
      description="Test rule-based strategies on historical prices, with an equity curve and full stats. Available on Pro."
      className="min-h-screen"
    >
      <Page />
    </ProGate>
  );
}

export default withAuth(GatedPage);
