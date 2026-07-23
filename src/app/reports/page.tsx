"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
import { useTrades } from "@/hooks/useTrades";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Spinner } from "@/components/Loaders";
import type { Trade } from "@/app/types/Trades";
import {
  allTradesTable,
  taxReportTable,
  monthlyPerformanceTable,
  strategyPerformanceTable,
  symbolPerformanceTable,
  backupJson,
  tableToCsv,
  type ReportTable,
} from "@/lib/reports";

// A single report. Table reports render on screen and export to CSV; the
// JSON backup previews as formatted text and exports as .json.
type ReportDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
} & (
  | { kind: "table"; build: (trades: Trade[]) => ReportTable }
  | { kind: "json"; build: (trades: Trade[]) => string }
);

const DATA_REPORTS: ReportDef[] = [
  {
    id: "all-trades",
    title: "All trades",
    description: "Every trade, all fields.",
    icon: "fa-solid fa-table-list",
    kind: "table",
    build: allTradesTable,
  },
  {
    id: "backup",
    title: "Full backup",
    description: "Raw JSON of everything.",
    icon: "fa-solid fa-database",
    kind: "json",
    build: backupJson,
  },
];

const ANALYTICS_REPORTS: ReportDef[] = [
  {
    id: "tax",
    title: "Tax report",
    description: "Gain/loss per position.",
    icon: "fa-solid fa-file-invoice-dollar",
    kind: "table",
    build: taxReportTable,
  },
  {
    id: "monthly",
    title: "Monthly performance",
    description: "Net P/L by month.",
    icon: "fa-solid fa-calendar-check",
    kind: "table",
    build: monthlyPerformanceTable,
  },
  {
    id: "strategy",
    title: "Strategy performance",
    description: "Net P/L by strategy.",
    icon: "fa-solid fa-bezier-curve",
    kind: "table",
    build: strategyPerformanceTable,
  },
  {
    id: "symbol",
    title: "Symbol performance",
    description: "Net P/L by symbol.",
    icon: "fa-solid fa-coins",
    kind: "table",
    build: symbolPerformanceTable,
  },
];

const RANGES = [
  { key: "all", label: "All time" },
  { key: "ytd", label: "This year" },
  { key: "12m", label: "Last 12 months" },
  { key: "custom", label: "Custom" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

// Trigger a client-side file download from an in-memory string.
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

// Columns whose numeric cells should be tinted by sign.
const SIGNED_COL = /(P\/L|Gain\/Loss|Expectancy)/;

// The report currently open in the preview modal.
type Preview =
  | { def: ReportDef; kind: "table"; table: ReportTable }
  | { def: ReportDef; kind: "json"; text: string };

function Page() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // Pull every trade (real + simulated); we scope client-side below.
  const { data: allTrades = [], isLoading } = useTrades(userId);

  const [range, setRange] = useState<RangeKey>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeSim, setIncludeSim] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  // Resolve the active [from, to] day bounds for the chosen preset. The
  // range filters on entry date (dateBought).
  const bounds = useMemo<{ from: Date | null; to: Date | null }>(() => {
    const now = new Date();
    if (range === "ytd") {
      return { from: new Date(now.getFullYear(), 0, 1), to: null };
    }
    if (range === "12m") {
      const f = new Date(now);
      f.setFullYear(f.getFullYear() - 1);
      return { from: f, to: null };
    }
    if (range === "custom") {
      return {
        from: from ? new Date(from + "T00:00:00") : null,
        to: to ? new Date(to + "T23:59:59") : null,
      };
    }
    return { from: null, to: null };
  }, [range, from, to]);

  const trades = useMemo(() => {
    return allTrades.filter((t) => {
      if (!includeSim && t.simulated) return false;
      if (!bounds.from && !bounds.to) return true;
      const d = t.dateBought ? new Date(t.dateBought).getTime() : NaN;
      if (Number.isNaN(d)) return false;
      if (bounds.from && d < bounds.from.getTime()) return false;
      if (bounds.to && d > bounds.to.getTime()) return false;
      return true;
    });
  }, [allTrades, includeSim, bounds]);

  const closedCount = trades.filter(
    (t) => t.status === "WIN" || t.status === "LOSS",
  ).length;
  const empty = trades.length === 0;

  const openPreview = (r: ReportDef) => {
    if (r.kind === "table") {
      setPreview({ def: r, kind: "table", table: r.build(trades) });
    } else {
      setPreview({ def: r, kind: "json", text: r.build(trades) });
    }
  };

  const downloadPreview = () => {
    if (!preview) return;
    const stamp = format(new Date(), "yyyyMMdd");
    if (preview.kind === "table") {
      downloadFile(
        `cuequill-${preview.def.id}-${stamp}.csv`,
        tableToCsv(preview.table),
        "csv",
      );
    } else {
      downloadFile(
        `cuequill-${preview.def.id}-${stamp}.json`,
        preview.text,
        "json",
      );
    }
  };

  const renderCard = (r: ReportDef, i: number) => (
    <motion.button
      key={r.id}
      type="button"
      onClick={() => openPreview(r)}
      disabled={empty}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: i * 0.03 }}
      className="group text-left flex items-start gap-3.5 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.03] disabled:hover:border-white/10 cursor-pointer"
    >
      <div className="shrink-0 w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300">
        <i className={`${r.icon} text-[14px]`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold tracking-tight">
            {r.title}
          </span>
          <span className="text-[9px] uppercase tracking-wide text-white/40 border border-white/15 rounded px-1 py-0.5">
            {r.kind === "json" ? "json" : "csv"}
          </span>
        </div>
        <p className="text-[12px] text-white/50 mt-0.5 leading-snug">
          {r.description}
        </p>
      </div>
      <i className="fa-solid fa-eye shrink-0 text-white/30 group-hover:text-teal-300 transition mt-1 text-[12px]" />
    </motion.button>
  );

  return (
    <div className="w-full flex flex-col min-h-screen pb-24">
      {/* Aurora wash, matching the other app surfaces. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[900px] px-4 md:px-6 pt-24 md:pt-8 flex flex-col gap-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Reports</h1>
          <p className="text-[13px] text-white/50 mt-1">
            Preview your trading data and performance summaries, then download
            any of them as spreadsheet-ready files.
          </p>
        </div>

        {/* Scope controls */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 md:p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition cursor-pointer ${
                  range === r.key
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                    : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[12px] text-white/45">From</label>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="px-2.5 py-1.5 text-[13px] bg-white/[0.03] rounded-lg border border-white/10 focus:border-white/25 focus:outline-none transition appearance-none"
              />
              <label className="text-[12px] text-white/45">to</label>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="px-2.5 py-1.5 text-[13px] bg-white/[0.03] rounded-lg border border-white/10 focus:border-white/25 focus:outline-none transition appearance-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={includeSim}
                onChange={(e) => setIncludeSim(e.target.checked)}
                className="w-3.5 h-3.5 accent-orange-500 cursor-pointer"
              />
              <span className="text-[13px] text-white/65 group-hover:text-white transition">
                Include simulated trades
              </span>
            </label>
            <span className="text-[12px] text-white/45 inline-flex items-center gap-2">
              {isLoading ? (
                <>
                  <Spinner size={12} /> Loading…
                </>
              ) : (
                <>
                  {trades.length} trade{trades.length === 1 ? "" : "s"} in scope
                  {" · "}
                  {closedCount} closed
                </>
              )}
            </span>
          </div>
        </div>

        {empty && !isLoading && (
          <p className="text-[13px] text-white/40 -mt-2">
            No trades match the current scope. Widen the date range or include
            simulated trades.
          </p>
        )}

        {/* Data exports */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] text-white/50 font-medium">
            Data exports
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {DATA_REPORTS.map(renderCard)}
          </div>
        </section>

        {/* Performance & tax */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] text-white/50 font-medium">
            Performance &amp; tax
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ANALYTICS_REPORTS.map(renderCard)}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {preview && (
          <PreviewModal
            preview={preview}
            onClose={() => setPreview(null)}
            onDownload={downloadPreview}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewModal({
  preview,
  onClose,
  onDownload,
}: {
  preview: Preview;
  onClose: () => void;
  onDownload: () => void;
}) {
  useScrollLock();

  const rowCount =
    preview.kind === "table" ? preview.table.rows.length : undefined;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="modal-scrim absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative w-full max-w-5xl max-h-[86vh] flex flex-col rounded-2xl border border-white/10 bg-[var(--surface-2)] shadow-[0_24px_80px_var(--shadow)] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-white/10">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight truncate">
              {preview.def.title}
            </h3>
            <p className="text-[12px] text-white/45">
              {rowCount != null
                ? `${rowCount} row${rowCount === 1 ? "" : "s"}`
                : "JSON preview"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition text-[12.5px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-arrow-down text-[11px]" />
              Download {preview.kind === "json" ? "JSON" : "CSV"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-[14px]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto thin-scroll">
          {preview.kind === "table" ? (
            <ReportTableView table={preview.table} />
          ) : (
            <pre className="p-4 text-[11.5px] leading-relaxed text-white/75 whitespace-pre-wrap break-words font-mono">
              {preview.text}
            </pre>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportTableView({ table }: { table: ReportTable }) {
  if (table.rows.length === 0) {
    return (
      <p className="text-[13px] text-white/40 p-6 text-center">
        This report has no rows for the current scope.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-[12px]">
      <thead className="sticky top-0 z-10 bg-[var(--surface-2)]">
        <tr>
          {table.columns.map((c) => {
            const signed = SIGNED_COL.test(c);
            return (
              <th
                key={c}
                className={`text-white/55 font-medium whitespace-nowrap px-3 py-2.5 border-b border-white/10 ${
                  signed ? "text-right" : "text-left"
                }`}
              >
                {c}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, ri) => (
          <tr
            key={ri}
            className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
          >
            {row.map((cell, ci) => {
              const col = table.columns[ci];
              const isNum = typeof cell === "number";
              const signed = SIGNED_COL.test(col) && isNum;
              const tone = signed
                ? (cell as number) > 0
                  ? "text-green-400"
                  : (cell as number) < 0
                    ? "text-red-400"
                    : "text-white/70"
                : "text-white/75";
              return (
                <td
                  key={ci}
                  className={`px-3 py-2 whitespace-nowrap ${
                    isNum ? "text-right tabular-nums" : "text-left"
                  } ${tone} ${col === "Notes" ? "max-w-[280px] truncate" : ""}`}
                  title={col === "Notes" ? String(cell) : undefined}
                >
                  {cell === "" ? "—" : String(cell)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GatedPage() {
  return (
    <ProGate
      feature="Reports"
      description="Preview your full trade history and performance, tax and strategy summaries, then export them as spreadsheet-ready files. Available on Pro."
      className="min-h-screen"
    >
      <Page />
    </ProGate>
  );
}

export default withAuth(GatedPage);
