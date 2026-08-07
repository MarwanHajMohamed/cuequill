"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip as ReTooltip,
} from "recharts";
import { withAuth } from "@/lib/withAuth";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Spinner } from "@/components/Loaders";
import { tableToCsv, type ReportTable } from "@/lib/reports";
import {
  getReport,
  scopeTrades,
  RANGES,
  DEFAULT_SCOPE,
  type Scope,
  type RangeKey,
} from "../registry";

// Columns whose numeric cells should be tinted by sign.
const SIGNED_COL = /(P\/L|Gain\/Loss|Expectancy)/;

// One transition shared by every part of the filter collapse animation
// (the range container's resize, each pill, the custom-date block, and the
// chevron's slide) so they all move at exactly the same speed.
const FILTER_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;

function downloadFile(filename: string, content: string, ext: "csv" | "json") {
  const mime =
    ext === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Page() {
  const params = useParams<{ report: string }>();
  const def = getReport(params.report);

  const { data: session } = useSession();
  const userId = session?.user?.id;
  // Reports follow the app's global simulated toggle: in simulated mode
  // they cover simulated trades, otherwise real trades — never mixed.
  const [simulated, setSimulated] = useState(false);
  useEffect(() => {
    setSimulated(localStorage.getItem("simulated") === "true");
  }, []);
  const { data: allTrades = [], isLoading } = useTrades(userId, simulated);

  // Scope persists across reports so switching between them keeps the
  // same window.
  const [scope, setScope] = useLocalStorage<Scope>(
    "reports:scope",
    DEFAULT_SCOPE,
  );
  const patch = (p: Partial<Scope>) => setScope({ ...scope, ...p });
  const [filtersOpen, setFiltersOpen] = useState(true);

  // The filters bar sticks to the top; measure its height so the floating
  // table header pins directly beneath it.
  const filtersRef = useRef<HTMLDivElement>(null);
  const [stickyTop, setStickyTop] = useState(52);
  useEffect(() => {
    const el = filtersRef.current;
    if (!el) return;
    const measure = () => setStickyTop(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const trades = useMemo(
    () => scopeTrades(allTrades, scope),
    [allTrades, scope],
  );

  const closedCount = trades.filter(
    (t) => t.status === "WIN" || t.status === "LOSS",
  ).length;

  const table: ReportTable | null =
    def?.kind === "table" ? def.build(trades) : null;
  const json: string | null = def?.kind === "json" ? def.build(trades) : null;

  const download = () => {
    if (!def) return;
    const stamp = format(new Date(), "yyyyMMdd");
    if (def.kind === "table" && table) {
      downloadFile(`cuequill-${def.id}-${stamp}.csv`, tableToCsv(table), "csv");
    } else if (json != null) {
      downloadFile(`cuequill-${def.id}-${stamp}.json`, json, "json");
    }
  };

  if (!def) {
    return (
      <div className="w-full flex justify-center min-h-screen">
        <div className="w-full max-w-[760px] px-5 md:px-8 pt-24 md:pt-12">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition"
          >
            <i className="fa-solid fa-chevron-left text-[11px]" />
            Reports
          </Link>
          <p className="mt-6 text-[14px] text-white/60">
            That report doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const rowCount = table?.rows.length ?? 0;
  const empty = table != null && rowCount === 0;

  return (
    <div className="w-full flex justify-center">
      {/* Natural page flow — the window scrolls. The heading and filters
          scroll away; only the table's column header pins to the top.
          Bottom padding clears the mobile tab bar. */}
      <div className="w-full px-5 md:px-8 pt-24 md:pt-8 pb-24 md:pb-16">
        {/* Breadcrumb */}
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-white/50 hover:text-white transition w-fit"
        >
          <i className="fa-solid fa-chevron-left text-[10px]" />
          Reports
        </Link>

        {/* Heading */}
        <div className="mt-3 flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight">
              {def.title}
            </h1>
            <p className="text-[13px] text-white/50 mt-1">{def.description}</p>
          </div>
          <button
            type="button"
            onClick={download}
            disabled={def.kind === "table" && empty}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/15 hover:bg-white/10 hover:border-white/25 transition text-[13px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-arrow-down text-[11px]" />
            Download {def.kind === "json" ? "JSON" : "CSV"}
          </button>
        </div>

        {/* Filters — a sticky bar that pins to the top on scroll. Collapsing
            animates the inactive ranges away toward the selected one; the
            chevron on the right points left to close, right to open. */}
        <div
          ref={filtersRef}
          className="sticky top-0 z-30 -mx-5 md:-mx-8 px-5 md:px-8 py-3 bg-[rgb(var(--bg-rgb))] flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="inline-flex items-center gap-2">
            <motion.div
              layout
              transition={FILTER_TRANSITION}
              className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden"
            >
              {RANGES.map((r) => {
                const active = scope.range === r.key;
                const visible = filtersOpen || active;
                return (
                  <AnimatePresence key={r.key} initial={false} mode="popLayout">
                    {visible && (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={FILTER_TRANSITION}
                        type="button"
                        onClick={() => patch({ range: r.key as RangeKey })}
                        className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap cursor-pointer ${
                          active
                            ? "bg-white/[0.10] text-white"
                            : "text-white/55 hover:text-white/85"
                        }`}
                      >
                        {r.label}
                      </motion.button>
                    )}
                  </AnimatePresence>
                );
              })}
            </motion.div>

            <AnimatePresence initial={false}>
              {filtersOpen && scope.range === "custom" && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={FILTER_TRANSITION}
                  className="inline-flex items-center gap-2"
                >
                  <input
                    type="date"
                    value={scope.from}
                    max={scope.to || undefined}
                    onChange={(e) => patch({ from: e.target.value })}
                    className="px-2.5 py-1.5 text-[12.5px] bg-white/[0.04] rounded-lg border border-white/10 focus:border-white/25 focus:outline-none transition appearance-none"
                  />
                  <span className="text-[12px] text-white/40">–</span>
                  <input
                    type="date"
                    value={scope.to}
                    min={scope.from || undefined}
                    onChange={(e) => patch({ to: e.target.value })}
                    className="px-2.5 py-1.5 text-[12.5px] bg-white/[0.04] rounded-lg border border-white/10 focus:border-white/25 focus:outline-none transition appearance-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              layout
              transition={FILTER_TRANSITION}
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-label={filtersOpen ? "Collapse filters" : "Expand filters"}
              title={filtersOpen ? "Collapse filters" : "Expand filters"}
              className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <i
                className="fa-solid fa-chevron-left text-[11px]"
                style={{
                  transform: filtersOpen ? "rotate(0deg)" : "rotate(180deg)",
                  transition: "transform 180ms ease-out",
                }}
              />
            </motion.button>
          </div>

          <span className="text-[12px] text-white/40 tabular-nums inline-flex items-center gap-2">
            {isLoading ? (
              <>
                <Spinner size={12} /> Loading…
              </>
            ) : def.kind === "table" ? (
              <>
                {rowCount} row{rowCount === 1 ? "" : "s"}
                {" · "}
                {closedCount} closed
              </>
            ) : (
              <>
                {trades.length} trade{trades.length === 1 ? "" : "s"}
              </>
            )}
          </span>
        </div>

        {/* Report body — flows below; the window scrolls. Horizontal scroll
            stays inside the table, and a JS-synced floating clone keeps the
            column header pinned beneath the sticky filters. */}
        {isLoading ? (
          <div className="mt-4 flex items-center justify-center py-20 text-white/40">
            <Spinner size={20} />
          </div>
        ) : table ? (
          <div className="mt-4 flex flex-col gap-4">
            {def.chart && table.rows.length > 0 && (
              <ReportChart table={table} />
            )}
            <ScrollTable table={table} stickyTop={stickyTop} />
          </div>
        ) : (
          <pre className="mt-4 rounded-xl border border-white/10 bg-[var(--surface-2)] overflow-auto thin-scroll p-4 text-[11.5px] leading-relaxed text-white/70 whitespace-pre font-mono max-h-[70vh]">
            {json}
          </pre>
        )}
      </div>
    </div>
  );
}

// Columns rendered as USD.
const CURRENCY_COLS = new Set([
  "Gross P/L", "Net P/L", "Fees", "Expectancy",
  "Proceeds", "Cost basis", "Gain/Loss",
  "Contract price", "Closing price",
]);

function fmtUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return (
    sign +
    "$" +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Display string for a cell, adding $ / % where the column calls for it.
// The underlying data (and the CSV export) stay raw numbers.
function displayCell(col: string, cell: string | number): string {
  if (typeof cell !== "number") return cell === "" ? "—" : cell;
  if (col === "Win rate") return `${cell.toFixed(2)}%`;
  if (CURRENCY_COLS.has(col)) return fmtUsd(cell);
  return String(cell);
}

// Header cells for a report table — shared by the real header and the
// floating clone so they render identically.
function HeaderRow({
  columns,
  numericCols,
}: {
  columns: string[];
  numericCols: boolean[];
}) {
  return (
    <tr className="border-b border-white/10">
      {columns.map((c, ci) => (
        <th
          key={c}
          className={`font-medium text-white/45 whitespace-nowrap px-3.5 py-2.5 ${
            numericCols[ci] ? "text-right" : "text-left"
          }`}
        >
          {c}
        </th>
      ))}
    </tr>
  );
}

// Memoised body so scroll-driven re-renders of the wrapper (clone position,
// horizontal offset) don't re-render every row.
const TableBody = memo(function TableBody({
  table,
  numericCols,
}: {
  table: ReportTable;
  numericCols: boolean[];
}) {
  return (
    <tbody>
      {table.rows.map((row, ri) => (
        <tr
          key={ri}
          className="odd:bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
        >
          {row.map((cell, ci) => {
            const col = table.columns[ci];
            const num = numericCols[ci];
            const signed = SIGNED_COL.test(col) && typeof cell === "number";
            const tone = signed
              ? (cell as number) > 0
                ? "text-green-400"
                : (cell as number) < 0
                  ? "text-red-400"
                  : "text-white/70"
              : ci === 0
                ? "text-white/90 font-medium"
                : "text-white/70";
            return (
              <td
                key={ci}
                className={`px-3.5 py-2 whitespace-nowrap border-b border-white/[0.04] ${
                  num ? "text-right tabular-nums" : "text-left"
                } ${tone} ${col === "Notes" ? "max-w-[320px] truncate" : ""}`}
                title={col === "Notes" ? String(cell) : undefined}
              >
                {displayCell(col, cell)}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
});

// Table in a horizontal-scroll panel (so the page never scrolls sideways),
// with a JS-synced floating header: once the real header scrolls above the
// sticky filters bar, a fixed clone appears pinned beneath it, matching the
// column widths and following the panel's horizontal scroll.
function ScrollTable({
  table,
  stickyTop,
}: {
  table: ReportTable;
  stickyTop: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);
  const [clone, setClone] = useState<{ left: number; width: number } | null>(
    null,
  );
  const [colW, setColW] = useState<number[]>([]);
  const [tableW, setTableW] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const numericCols = useMemo(
    () =>
      table.columns.map(
        (_, ci) =>
          table.rows.some((r) => typeof r[ci] === "number") &&
          table.rows.every((r) => typeof r[ci] === "number" || r[ci] === ""),
      ),
    [table],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    const head = headRef.current;
    if (!wrap || !head) return;

    const measure = () => {
      const ths = Array.from(head.querySelectorAll("th")) as HTMLElement[];
      setColW(ths.map((th) => th.getBoundingClientRect().width));
      const tbl = head.parentElement as HTMLElement | null;
      if (tbl) setTableW(tbl.getBoundingClientRect().width);
    };
    const update = () => {
      const wrapRect = wrap.getBoundingClientRect();
      const headRect = head.getBoundingClientRect();
      const show =
        headRect.top < stickyTop &&
        wrapRect.bottom > stickyTop + headRect.height;
      // Only touch state when it actually changes so vertical scrolling
      // with the clone already shown doesn't re-render.
      setClone((prev) => {
        if (!show) return prev ? null : prev;
        const left = wrapRect.left;
        const width = wrapRect.width;
        if (prev && prev.left === left && prev.width === width) return prev;
        return { left, width };
      });
    };
    const onWrapScroll = () => setScrollLeft(wrap.scrollLeft);

    measure();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    wrap.addEventListener("scroll", onWrapScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(wrap);
    ro.observe(head);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      wrap.removeEventListener("scroll", onWrapScroll);
      ro.disconnect();
    };
  }, [stickyTop, table]);

  if (table.rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--surface-2)]">
        <p className="text-[13px] text-white/40 py-16 text-center">
          No rows for the current scope. Try widening the date range.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="rounded-xl border border-white/10 bg-[var(--surface-2)] overflow-x-auto thin-scroll"
    >
      <table className="w-full border-collapse text-[12.5px]">
        <thead ref={headRef}>
          <HeaderRow columns={table.columns} numericCols={numericCols} />
        </thead>
        <TableBody table={table} numericCols={numericCols} />
      </table>

      {clone &&
        createPortal(
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: stickyTop,
              left: clone.left,
              width: clone.width,
              zIndex: 20,
              pointerEvents: "none",
              // Page-coloured backing so the rounded corners blend into the
              // page instead of revealing the rows scrolling behind.
              background: "rgb(var(--bg-rgb))",
            }}
          >
            <div className="rounded-t-xl border border-b-0 border-white/10 bg-[var(--surface-2)] box-border overflow-hidden">
              <div style={{ transform: `translateX(${-scrollLeft}px)` }}>
                <table
                  className="border-collapse text-[12.5px] bg-[var(--surface-2)]"
                  style={{ width: tableW, tableLayout: "fixed" }}
                >
                  <colgroup>
                    {colW.map((w, i) => (
                      <col key={i} style={{ width: w }} />
                    ))}
                  </colgroup>
                  <thead>
                    <HeaderRow
                      columns={table.columns}
                      numericCols={numericCols}
                    />
                  </thead>
                </table>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// Net-P/L bar chart for single-category aggregate reports: first column
// is the category, the "Net P/L" column is the value. Bars are tinted by
// sign, matching the table.
function ReportChart({ table }: { table: ReportTable }) {
  const netIdx = table.columns.indexOf("Net P/L");
  if (netIdx < 0) return null;

  const data = table.rows.map((r) => ({
    label: String(r[0]),
    net: typeof r[netIdx] === "number" ? (r[netIdx] as number) : 0,
  }));
  // Angle the labels once they'd collide, and reserve enough axis height
  // for the longest one so nothing gets clipped.
  const angled = data.length > 6;
  const longest = data.reduce((m, d) => Math.max(m, d.label.length), 0);
  const axisH = angled ? Math.min(120, 30 + longest * 6) : 24;

  return (
    <div className="shrink-0 h-[300px] rounded-xl border border-white/10 bg-[var(--surface-2)] p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--foreground)" }}
            interval={0}
            angle={angled ? -35 : 0}
            textAnchor={angled ? "end" : "middle"}
            height={axisH}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--foreground)" }}
            width={52}
            tickFormatter={(v) => fmtUsd(Number(v))}
          />
          <ReferenceLine y={0} stroke="var(--hairline)" />
          <ReTooltip
            cursor={{ fill: "rgb(var(--fg-rgb) / 0.05)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            // Recharts colours the item/label text inline (black by default),
            // overriding contentStyle — set them explicitly so the text stays
            // legible in dark mode.
            itemStyle={{ color: "var(--foreground)" }}
            labelStyle={{ color: "var(--foreground)" }}
            formatter={(v: number | string) => [fmtUsd(Number(v)), "Net P/L"]}
          />
          <Bar dataKey="net" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? "#22c55e" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default withAuth(Page);
