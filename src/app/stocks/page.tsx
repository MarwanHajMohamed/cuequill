"use client";

import { motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { useStocks, useSaveStocks, type StockRow } from "@/hooks/useStocks";
import { useToast } from "@/hooks/useToast";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const CELL_INPUT =
  "w-full bg-transparent rounded px-2 py-1 text-[13px] text-white/85 tabular-nums placeholder:text-white/25 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-white/15 transition";

export default function Page() {
  const { data: serverRows, isLoading } = useStocks();
  const save = useSaveStocks();
  const toast = useToast();

  const [rows, setRows] = useState<StockRow[]>([]);
  const [query, setQuery] = useState("");

  // Mirror server data into local editable state on load and after each
  // save (the PUT returns the normalized rows).
  useEffect(() => {
    if (serverRows) setRows(serverRows);
  }, [serverRows]);

  // Canonical, key-order-independent serialization so a difference in how
  // the server orders object keys can't make an unedited table read as
  // dirty on load.
  const serialize = (list: StockRow[]) =>
    JSON.stringify(
      list.map((r) => [r.id, r.name, r.cost, r.volume, r.distance]),
    );
  const dirty = useMemo(
    () => serialize(rows) !== serialize(serverRows ?? []),
    [rows, serverRows],
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (s) => !query || s.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [rows, query],
  );

  const updateCell = (id: string, field: keyof StockRow, value: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const addRow = () => {
    // Clear the search so the freshly appended (empty) row is visible.
    setQuery("");
    setRows((prev) => [
      ...prev,
      { id: newId(), name: "", cost: "", volume: "", distance: "" },
    ]);
  };

  const deleteRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const onSave = async () => {
    try {
      await save.mutateAsync(rows);
      toast("Stocks table saved");
    } catch {
      toast("Failed to save stocks table");
    }
  };

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 75%), radial-gradient(40% 45% at 80% 5%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1500px] mt-30 md:mt-10 px-5 md:px-10">
        {/* Toolbar - search on the left, add/save on the right. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          className="mt-8 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="relative md:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[12px]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-white/10 bg-white/[0.03] text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[11px]" />
              Add row
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || save.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition cursor-pointer disabled:cursor-default border border-teal-400/40 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/35"
            >
              {save.isPending ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-[11px]" />
                  Saving…
                </>
              ) : dirty ? (
                <>
                  <i className="fa-solid fa-floppy-disk text-[11px]" />
                  Save changes
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-[11px]" />
                  Saved
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Table card - fixed layout so columns share width evenly. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[560px]">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[24%]" />
                <col className="w-[22%]" />
                <col className="w-[24%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11px] tracking-wider text-white/40 border-b border-white/10">
                  <th className="py-3 px-5 font-medium">Ticker</th>
                  <th className="py-3 px-5 font-medium">Cost ($)</th>
                  <th className="py-3 px-5 font-medium">Volume (M)</th>
                  <th className="py-3 px-5 font-medium">
                    Distance (spot – strike)
                  </th>
                  <th className="py-3 px-3 font-medium sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="group border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition"
                  >
                    <td className="py-2 px-3">
                      <input
                        value={item.name}
                        onChange={(e) =>
                          updateCell(item.id, "name", e.target.value)
                        }
                        placeholder="Ticker"
                        className={`${CELL_INPUT} font-semibold text-[14px] text-white tracking-tight uppercase`}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        value={item.cost}
                        onChange={(e) =>
                          updateCell(item.id, "cost", e.target.value)
                        }
                        placeholder="—"
                        className={CELL_INPUT}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        value={item.volume}
                        onChange={(e) =>
                          updateCell(item.id, "volume", e.target.value)
                        }
                        placeholder="—"
                        className={CELL_INPUT}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        value={item.distance}
                        onChange={(e) =>
                          updateCell(item.id, "distance", e.target.value)
                        }
                        placeholder="—"
                        className={CELL_INPUT}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRow(item.id)}
                        aria-label={`Delete ${item.name || "row"}`}
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center text-white/30 hover:text-red-300 hover:bg-red-500/10 transition md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      >
                        <i className="fa-solid fa-trash-can text-[12px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isLoading && rows.length === 0 && (
              <div className="py-10 text-center text-[13px] text-white/40">
                Loading…
              </div>
            )}
            {!isLoading && rows.length === 0 && (
              <div className="py-10 text-center text-[13px] text-white/40">
                No tickers yet. Click “Add row” to start your table.
              </div>
            )}
            {!isLoading && rows.length > 0 && filtered.length === 0 && (
              <div className="py-10 text-center text-[13px] text-white/40">
                No tickers match.
              </div>
            )}
          </div>
        </motion.div>

        {dirty && (
          <p className="mt-3 text-[12px] text-white/40">
            You have unsaved changes.
          </p>
        )}
      </div>
    </div>
  );
}
