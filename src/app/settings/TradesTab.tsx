"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/useToast";
import { handleDeleteAllTrades } from "@/handlers/tradeHandlers";

type TradesTabProps = {
  file: File | null;
  status: string;
  setFile: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUpload: () => void;
};

export default function TradesTab({
  file,
  status,
  setFile,
  fileInputRef,
  handleUpload,
}: TradesTabProps) {
  const isError = status.toLowerCase().startsWith("error");
  const isSuccess = status.toLowerCase().startsWith("success");

  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  // Type "delete" before the destructive button enables; saves you from
  // wiping the journal with a misclick.
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim().toLowerCase() === "delete";

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <div className="text-[11px] tracking-[0.1em] text-teal-400/80 font-medium">
          Import trades
        </div>
        <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
          One-time CSV import from your IBKR Flex Query. For ongoing automated
          imports, use the IBKR Auto-sync tab.
        </p>
      </section>

      {/* Steps */}
      <section className="flex flex-col gap-3">
        <div className="text-[11px] tracking-[0.1em] text-white/45 font-medium">
          Setup
        </div>
        <ol className="flex flex-col gap-2.5 text-[13px] text-white/75 leading-relaxed">
          {[
            <>Log in to your IBKR account.</>,
            <>
              Go to{" "}
              <span className="text-white">
                Performance &amp; Reports &rsaquo; Flex Queries
              </span>
              .
            </>,
            <>Create a new Activity Flex Query.</>,
            <>
              Under <span className="text-white">Trades</span>, select: Symbol,
              Strike, Date/Time, Expiry, Put/Call, Quantity, Buy/Sell, TradePrice,
              Realized P/L,{" "}
              <span className="text-white">IBCommission</span>, and{" "}
              <span className="text-white">Taxes</span>.
            </>,
            <>Save, then run the query.</>,
            <>
              Set <span className="text-white">Period</span> to{" "}
              <span className="text-white">Year to Date</span> and{" "}
              <span className="text-white">Format</span> to{" "}
              <span className="text-white">CSV</span>.
            </>,
            <>Download the CSV and upload it below.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[11px] tabular-nums text-white/55 font-semibold">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Upload */}
      <section className="flex flex-col gap-3">
        <div className="text-[11px] tracking-[0.1em] text-white/45 font-medium">
          Upload
        </div>

        <input
          type="file"
          accept=".csv,text/csv"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef?.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium cursor-pointer"
          >
            <i className="fa-solid fa-file-arrow-up text-[11px]" />
            Choose CSV
          </button>
          <button
            onClick={handleUpload}
            disabled={!file}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
              file
                ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
            }`}
          >
            <i className="fa-solid fa-arrow-up-from-bracket text-[11px]" />
            Import
          </button>
        </div>

        {/* File chip */}
        {file && (
          <div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-[12px]">
            <i className="fa-regular fa-file text-white/55 text-[11px]" />
            <span className="text-white/85 truncate max-w-[280px]">
              {file.name}
            </span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-white/40 hover:text-white transition cursor-pointer"
              aria-label="Remove file"
            >
              <i className="fa-solid fa-xmark text-[10px]" />
            </button>
          </div>
        )}

        {/* Status */}
        {status && (
          <div
            className={`text-[12.5px] px-3 py-2 rounded-xl border ${
              isError
                ? "bg-red-500/10 text-red-300 border-red-500/25"
                : isSuccess
                  ? "bg-green-500/10 text-green-300 border-green-500/25"
                  : "bg-white/[0.03] text-white/65 border-white/10"
            }`}
          >
            {status}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="flex flex-col gap-3 mt-2">
        <div className="text-[11px] tracking-[0.1em] text-red-300/80 font-medium">
          Danger zone
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-[13px] font-medium text-white">
              Delete all trades
            </div>
            <div className="text-[12px] text-white/55 leading-relaxed">
              Permanently removes every {simulated ? "simulated" : "live"}{" "}
              trade in this journal. This cannot be undone.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmText("");
              setConfirmOpen(true);
            }}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition cursor-pointer text-[13px] font-medium"
          >
            <i className="fa-solid fa-trash-can text-[11px]" />
            Delete all
          </button>
        </div>
      </section>

      {confirmOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="flex flex-col gap-5 bg-[var(--surface)] border border-white/10 items-center p-6 md:p-7 rounded-2xl w-full max-w-md text-white text-center shadow-[0_20px_80px_var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <i className="fa-solid fa-triangle-exclamation text-red-300 text-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">Delete all trades?</div>
              <div className="text-[13px] text-white/55 leading-relaxed">
                This permanently removes every{" "}
                {simulated ? "simulated" : "live"} trade in this journal.
                The action can&apos;t be undone.
              </div>
            </div>
            <label className="w-full flex flex-col gap-1.5 text-left">
              <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
                Type &quot;delete&quot; to confirm
              </span>
              <input
                autoFocus
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[14px] text-white placeholder:text-white/30 focus:border-red-500/40 focus:outline-none transition"
              />
            </label>
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white transition cursor-pointer text-[13px]"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                disabled={!canDelete}
                className={`flex-1 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
                  canDelete
                    ? "bg-red-500/15 text-red-300 border-red-500/25 hover:bg-red-500/25 cursor-pointer"
                    : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!canDelete || !userId) return;
                  handleDeleteAllTrades(
                    userId,
                    simulated,
                    setConfirmOpen,
                    toast,
                    queryClient,
                  );
                  setConfirmText("");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
