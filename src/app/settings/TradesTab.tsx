"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/useToast";
import { useScrollLock } from "@/hooks/useScrollLock";
import { handleDeleteAllTrades } from "@/handlers/tradeHandlers";

// ── Import sources ─────────────────────────────────────────────────────
// Each source is a broker (or a Cuequill re-import). `endpoint` picks the
// API: "ibkr" (Flex CSV), "cuequill" (All-trades re-import), or "brokers"
// (the shared file-adapter route, keyed by `brokerId`).
type SourceId =
  | "ibkr"
  | "tastytrade"
  | "robinhood"
  | "webull"
  | "firstrade"
  | "cuequill";

type ImportSource = {
  id: SourceId;
  label: string;
  // `img` fills the tile with a real logo asset; `node` renders a mark (the
  // Cuequill quill) on a branded tile; otherwise a monogram/icon is drawn.
  logo: {
    img?: string;
    node?: React.ReactNode;
    bg?: string;
    fg?: string;
    mono?: string;
    icon?: string;
  };
  endpoint: "ibkr" | "cuequill" | "brokers";
  brokerId?: string;
  blurb: string;
  steps: React.ReactNode[];
};

// The Cuequill quill mark (matches the navbar logo).
function QuillMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="16 25 30 52"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
        fill="currentColor"
      />
      <path
        d="M31 47V75"
        style={{ stroke: "var(--background)" }}
        strokeWidth="1.32"
        strokeLinecap="round"
      />
      <path
        d="M31 54.56C31.8616 54.56 32.56 53.8616 32.56 53C32.56 52.1384 31.8616 51.44 31 51.44C30.1384 51.44 29.44 52.1384 29.44 53C29.44 53.8616 30.1384 54.56 31 54.56Z"
        style={{ fill: "var(--background)" }}
      />
    </svg>
  );
}

const SOURCES: ImportSource[] = [
  {
    id: "ibkr",
    label: "Interactive Brokers",
    logo: { img: "/IBKR.png" },
    endpoint: "ibkr",
    blurb: "One-time CSV import from an IBKR Flex Query.",
    steps: [
      <>Log in to your IBKR account.</>,
      <>
        Go to{" "}
        <span className="text-white">Performance &amp; Reports &rsaquo; Flex Queries</span>.
      </>,
      <>Create a new Activity Flex Query.</>,
      <>
        Under <span className="text-white">Trades</span>, select: Symbol, Strike,
        Date/Time, Expiry, Put/Call, Quantity, Buy/Sell, TradePrice, Realized
        P/L, <span className="text-white">IBCommission</span>, and{" "}
        <span className="text-white">Taxes</span>.
      </>,
      <>
        Save and run it with <span className="text-white">Format</span> ={" "}
        <span className="text-white">CSV</span>.
      </>,
      <>Download the CSV and drop it below.</>,
    ],
  },
  {
    id: "tastytrade",
    label: "Tastytrade",
    logo: { img: "/tastytrade.jpg" },
    endpoint: "brokers",
    brokerId: "tastytrade",
    blurb: "Import your transaction history CSV.",
    steps: [
      <>Open Tastytrade (web or desktop).</>,
      <>
        Go to <span className="text-white">History &rsaquo; Transactions</span>.
      </>,
      <>Export the transaction history as CSV.</>,
      <>Drop the CSV below.</>,
    ],
  },
  {
    id: "robinhood",
    label: "Robinhood",
    logo: { img: "/robinhood.png" },
    endpoint: "brokers",
    brokerId: "robinhood",
    blurb: "Import your options activity CSV.",
    steps: [
      <>Open Robinhood on the web.</>,
      <>
        Go to <span className="text-white">Account &rsaquo; Reports &amp; statements</span>.
      </>,
      <>Generate/export your account activity as CSV.</>,
      <>Drop the CSV below.</>,
    ],
  },
  {
    id: "webull",
    label: "Webull",
    logo: { img: "/webull.png" },
    endpoint: "brokers",
    brokerId: "webull",
    blurb: "Import your filled order history CSV.",
    steps: [
      <>Open Webull (desktop gives the fullest export).</>,
      <>
        Go to <span className="text-white">Orders / Order History</span>.
      </>,
      <>Export your filled orders as CSV.</>,
      <>Drop the CSV below.</>,
    ],
  },
  {
    id: "firstrade",
    label: "Firstrade",
    logo: { img: "/firstrade.png" },
    endpoint: "brokers",
    brokerId: "firstrade",
    blurb: "Import your account history CSV.",
    steps: [
      <>Log in to Firstrade.</>,
      <>
        Go to <span className="text-white">Accounts &rsaquo; History</span>.
      </>,
      <>Export your trade history as CSV.</>,
      <>Drop the CSV below.</>,
    ],
  },
  {
    id: "cuequill",
    label: "Cuequill",
    logo: {
      bg: "#fff",
      fg: "#0d9488",
      node: <QuillMark className="h-[62%] w-auto" />,
    },
    endpoint: "cuequill",
    blurb: "Re-import a CSV you exported from Cuequill.",
    steps: [
      <>
        Go to <span className="text-white">Reports &rsaquo; All trades</span>.
      </>,
      <>
        Click <span className="text-white">Download CSV</span>.
      </>,
      <>Drop that CSV below. Trades you already have are skipped.</>,
    ],
  },
];

function BrokerLogo({
  logo,
  size = 44,
}: {
  logo: ImportSource["logo"];
  size?: number;
}) {
  if (logo.img) {
    // Fill the tile edge-to-edge with the logo asset (each already carries its
    // own background).
    return (
      <div
        className="shrink-0 rounded-xl overflow-hidden"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.img} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (logo.node) {
    return (
      <div
        className="shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: logo.bg,
          color: logo.fg ?? "#fff",
        }}
      >
        {logo.node}
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-xl flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        background: logo.bg,
        color: logo.fg,
        fontSize: size * 0.34,
      }}
    >
      {logo.icon ? (
        <i className={`fa-solid ${logo.icon}`} style={{ fontSize: size * 0.42 }} />
      ) : (
        logo.mono
      )}
    </div>
  );
}

export default function TradesTab() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const [selected, setSelected] = useState<ImportSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isError = status.toLowerCase().startsWith("error");
  const isSuccess = status.toLowerCase().startsWith("imported");

  const openSource = (s: ImportSource) => {
    setSelected(s);
    setFile(null);
    setStatus("");
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      setStatus("Error: Please choose a .csv file.");
      return;
    }
    setFile(f);
    setStatus("");
  };

  const handleImport = async () => {
    if (!file || !selected) return;
    setBusy(true);
    setStatus("Uploading…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      let url = "/api/brokers/import";
      if (selected.endpoint === "ibkr") {
        url = "/api/import-trades";
        if (userId) fd.append("userId", userId);
      } else if (selected.endpoint === "cuequill") {
        url = "/api/import-trades/cuequill";
      } else {
        fd.append("broker", selected.brokerId ?? selected.id);
      }

      const res = await fetch(url, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`Error: ${data.error ?? "Import failed"}`);
        return;
      }
      const bits = [`Imported ${data.inserted ?? 0}`];
      const dupes = (data.duplicates ?? 0) + (data.skipped ?? 0);
      if (dupes) bits.push(`${dupes} already existed`);
      setStatus(bits.join(" · "));
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["trades", userId] });
    } catch {
      setStatus("Error: Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim().toLowerCase() === "delete";
  useScrollLock(confirmOpen);
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
      {!selected ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] tracking-[0.1em] text-teal-400/80 font-medium">
              Import trades
            </div>
            <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
              Select a broker below to import from.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => openSource(s)}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition px-3.5 py-3 text-left cursor-pointer"
              >
                <BrokerLogo logo={s.logo} />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium truncate">
                    {s.label}
                  </div>
                  <div className="text-[11px] text-white/45 truncate">
                    CSV import
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-5">
          {/* Selected-source header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              aria-label="Back to brokers"
              className="shrink-0 w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] transition flex items-center justify-center cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-[12px]" />
            </button>
            <BrokerLogo logo={selected.logo} size={40} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold truncate">
                Import from {selected.label}
              </div>
              <div className="text-[12px] text-white/50 truncate">
                {selected.blurb}
              </div>
            </div>
          </div>

          {/* Steps */}
          <ol className="flex flex-col gap-2.5 text-[13px] text-white/75 leading-relaxed">
            {selected.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[11px] tabular-nums text-white/55 font-semibold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {/* Drop zone */}
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`rounded-2xl border border-dashed px-5 py-8 text-center transition cursor-pointer ${
              dragOver
                ? "border-teal-400/50 bg-teal-500/[0.06]"
                : "border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25"
            }`}
          >
            <i className="fa-solid fa-file-arrow-up text-[18px] text-white/45" />
            <div className="mt-2 text-[13px] text-white/70">
              {file ? (
                <span className="text-white/90 font-medium">{file.name}</span>
              ) : (
                <>
                  Drop your CSV here, or{" "}
                  <span className="text-teal-300">browse</span>
                </>
              )}
            </div>
            {file && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setStatus("");
                }}
                className="mt-2 text-[11.5px] text-white/45 hover:text-white transition cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={!file || busy}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition text-[13px] font-medium ${
                file && !busy
                  ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                  : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
              }`}
            >
              <i
                className={`fa-solid ${
                  busy ? "fa-circle-notch animate-spin" : "fa-arrow-up-from-bracket"
                } text-[11px]`}
              />
              Import
            </button>
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
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section className="flex flex-col gap-3 mt-2 border-t border-white/[0.06] pt-6">
        <div className="text-[11px] tracking-[0.1em] text-red-300/80 font-medium">
          Danger zone
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-[13px] font-medium text-white">
              Delete all trades
            </div>
            <div className="text-[12px] text-white/55 leading-relaxed">
              Permanently removes every {simulated ? "simulated" : "live"} trade
              in this journal. This cannot be undone.
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
                {simulated ? "simulated" : "live"} trade in this journal. The
                action can&apos;t be undone.
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
