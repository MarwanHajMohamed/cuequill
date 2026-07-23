"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { withAuth } from "@/lib/withAuth";
import ProGate from "@/components/ProGate";
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
  const { data: allTrades = [], isLoading } = useTrades(userId);

  // Scope persists across reports so switching between them keeps the
  // same window.
  const [scope, setScope] = useLocalStorage<Scope>(
    "reports:scope",
    DEFAULT_SCOPE,
  );
  const patch = (p: Partial<Scope>) => setScope({ ...scope, ...p });

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
      <div className="w-full px-5 md:px-8 pt-24 md:pt-12 pb-16">
        {/* Breadcrumb + heading */}
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-white/50 hover:text-white transition w-fit"
        >
          <i className="fa-solid fa-chevron-left text-[10px]" />
          Reports
        </Link>

        <div className="mt-3 flex items-end justify-between gap-4 flex-wrap pb-5 border-b border-white/10">
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

        {/* Scope toolbar — stays above the table, which scrolls within its
            own container below. */}
        <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Segmented range control */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/10">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => patch({ range: r.key as RangeKey })}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition cursor-pointer ${
                    scope.range === r.key
                      ? "bg-white/[0.10] text-white"
                      : "text-white/55 hover:text-white/85"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {scope.range === "custom" && (
              <div className="inline-flex items-center gap-2">
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
              </div>
            )}

            <label className="inline-flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={scope.includeSim}
                onChange={(e) => patch({ includeSim: e.target.checked })}
                className="w-3.5 h-3.5 accent-teal-500 cursor-pointer"
              />
              <span className="text-[12.5px] text-white/55 group-hover:text-white/85 transition">
                Include simulated
              </span>
            </label>
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

        {/* Report body. The table lives in its own scroll container so a
            wide table scrolls horizontally inside the panel instead of
            widening the whole page; a tall one scrolls vertically with the
            header pinned. The container hugs its content up to a cap, so a
            short report leaves no empty box and adds no page scrollbar. */}
        {isLoading ? (
          <div className="mt-4 flex items-center justify-center py-20 text-white/40">
            <Spinner size={20} />
          </div>
        ) : table ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-[var(--surface-2)] overflow-auto thin-scroll max-h-[calc(100dvh-230px)]">
            <TableView table={table} />
          </div>
        ) : (
          <pre className="mt-4 rounded-xl border border-white/10 bg-[var(--surface-2)] overflow-auto thin-scroll p-4 text-[11.5px] leading-relaxed text-white/70 whitespace-pre font-mono max-h-[calc(100dvh-230px)]">
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

function TableView({ table }: { table: ReportTable }) {
  if (table.rows.length === 0) {
    return (
      <p className="text-[13px] text-white/40 py-16 text-center">
        No rows for the current scope. Widen the date range or include
        simulated trades.
      </p>
    );
  }

  // A column is numeric (→ right-aligned header and cells) when every
  // populated cell in it is a number. Aligning on the column, not the
  // individual cell, keeps the numbers sitting under their header.
  const numericCols = table.columns.map(
    (_, ci) =>
      table.rows.some((r) => typeof r[ci] === "number") &&
      table.rows.every((r) => typeof r[ci] === "number" || r[ci] === ""),
  );

  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead className="sticky top-0 z-10 bg-[var(--surface-2)]">
        <tr className="border-b border-white/10">
          {table.columns.map((c, ci) => (
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
      </thead>
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
    </table>
  );
}

function GatedPage() {
  return (
    <ProGate
      feature="Reports"
      description="Review your full trade history and performance, tax and strategy summaries, then export them as spreadsheet-ready files. Available on Pro."
      className="min-h-screen"
    >
      <Page />
    </ProGate>
  );
}

export default withAuth(GatedPage);
