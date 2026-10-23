"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import IBKRTab from "./IBKRTab";

// ── Import sources ─────────────────────────────────────────────────────
// Each source is a broker (or a Cuequill re-import). `endpoint` picks the
// file-upload API: "ibkr" (Flex CSV), "cuequill" (All-trades re-import), or
// "brokers" (the shared file-adapter route, keyed by `brokerId`).
// `autoSync` flags brokers that can also pull trades automatically (today
// only IBKR, via the Flex Web Service).
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
  autoSync?: boolean;
  blurb: string;
  steps: React.ReactNode[];
};

const SOURCES: ImportSource[] = [
  {
    id: "ibkr",
    label: "Interactive Brokers",
    logo: { img: "/IBKR.png" },
    endpoint: "ibkr",
    autoSync: true,
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
    logo: { img: "/cuequill-icon.png" },
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
  layoutId,
  onSlideComplete,
}: {
  logo: ImportSource["logo"];
  size?: number;
  // When set, the tile logo and the detail-header logo share a layoutId so
  // Framer slides the mark between the two positions on open / back.
  layoutId?: string;
  // Fires when the shared-layout slide finishes (used to reveal the detail
  // body only after the logo has settled).
  onSlideComplete?: () => void;
}) {
  const style = { width: size, height: size } as React.CSSProperties;
  const common = {
    layoutId,
    transition: { layout: { duration: 0.34, ease: [0.4, 0, 0.2, 1] } },
    onLayoutAnimationComplete: onSlideComplete,
  } as const;
  if (logo.img) {
    // Fill the tile edge-to-edge with the logo asset (each already carries its
    // own background).
    return (
      <motion.div
        {...common}
        className="shrink-0 rounded-xl overflow-hidden"
        style={style}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.img} alt="" className="w-full h-full object-cover" />
      </motion.div>
    );
  }
  if (logo.node) {
    return (
      <motion.div
        {...common}
        className="shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ ...style, background: logo.bg, color: logo.fg ?? "#fff" }}
      >
        {logo.node}
      </motion.div>
    );
  }
  return (
    <motion.div
      {...common}
      className="shrink-0 rounded-xl flex items-center justify-center font-bold"
      style={{
        ...style,
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
    </motion.div>
  );
}

// Small capability pill shown on each broker tile.
function Tag({
  label,
  tone,
}: {
  label: string;
  tone: "teal" | "slate";
}) {
  const styles =
    tone === "teal"
      ? "bg-teal-500/10 text-teal-300 border-teal-500/25"
      : "bg-white/[0.04] text-white/55 border-white/10";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9.5px] font-medium tracking-normal ${styles}`}
    >
      {label}
    </span>
  );
}

export default function BrokersTab() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<ImportSource | null>(null);
  // Detail sub-view: "upload" (file import) or "autosync" (IBKR Flex sync).
  const [view, setView] = useState<"upload" | "autosync">("upload");
  // Gate the detail body (header text, tabs, panel) until the logo has
  // finished sliding from its tile into the header, so the two animations
  // don't run at once.
  const [contentReady, setContentReady] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isError = status.toLowerCase().startsWith("error");
  const isSuccess = status.toLowerCase().startsWith("imported");

  const openSource = (s: ImportSource) => {
    setSelected(s);
    setContentReady(false);
    // Auto-sync brokers open on their sync tab (the headline feature);
    // everyone else only has file upload.
    setView(s.autoSync ? "autosync" : "upload");
    setFile(null);
    setStatus("");
  };

  const backToGrid = () => {
    setSelected(null);
    setContentReady(false);
  };

  // Safety net: if the logo's layout-complete callback never fires (e.g.
  // reduced motion, or the layout animation is skipped), reveal the body
  // anyway shortly after opening.
  useEffect(() => {
    if (!selected || contentReady) return;
    const t = setTimeout(() => setContentReady(true), 480);
    return () => clearTimeout(t);
  }, [selected, contentReady]);

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

  // File-upload panel body (steps + drop zone + import button). Shared by
  // every broker; for IBKR it's the second tab, for the rest it's the whole
  // detail view.
  const UploadPanel = selected && (
    <section className="flex flex-col gap-5">
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
  );

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6">
      <LayoutGroup>
        {!selected ? (
          <motion.section
            key="grid"
            className="flex flex-col gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] tracking-[0.1em] text-teal-400/80 font-medium">
                Brokers
              </div>
              <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
                Select a broker to import trades from, or set up an automatic
                sync.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSource(s)}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition px-3.5 py-3 text-left cursor-pointer"
                >
                  <BrokerLogo logo={s.logo} layoutId={`broker-logo-${s.id}`} />
                  <div className="min-w-0 flex flex-col gap-1.5">
                    <div className="text-[13.5px] font-medium truncate">
                      {s.label}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {s.autoSync && <Tag label="Auto sync" tone="teal" />}
                      <Tag label="File upload" tone="slate" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.section>
        ) : (
          <section key="detail" className="flex flex-col gap-5">
            {/* Selected-broker header. The logo is always mounted so it can
                slide in from its tile; the back button + text reveal only
                once that slide finishes (contentReady). */}
            <div className="flex items-center gap-3">
              <button
                onClick={backToGrid}
                aria-label="Back to brokers"
                className="shrink-0 w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] transition flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-[12px]" />
              </button>
              <BrokerLogo
                logo={selected.logo}
                size={40}
                layoutId={`broker-logo-${selected.id}`}
                onSlideComplete={() => setContentReady(true)}
              />
              <AnimatePresence>
                {contentReady && (
                  <motion.div
                    className="min-w-0"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <div className="text-[15px] font-semibold truncate">
                      {selected.label}
                    </div>
                    <div className="text-[12px] text-white/50 truncate">
                      {selected.blurb}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Body: sub-tabs + panel, revealed after the logo settles. */}
            <AnimatePresence>
              {contentReady && (
                <motion.div
                  className="flex flex-col gap-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {/* Sub-tabs - only when the broker supports more than one
                      source. A shared-layout pill slides under the active
                      tab when switching. */}
                  {selected.autoSync && (
                    <div className="relative flex items-center gap-0.5 p-0.5 rounded-full border border-white/10 bg-white/[0.02] self-start">
                      {(
                        [
                          { id: "autosync", label: "Auto sync" },
                          { id: "upload", label: "File upload" },
                        ] as const
                      ).map((t) => {
                        const active = view === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setView(t.id)}
                            className={`relative px-3 py-1 rounded-full text-[12px] font-medium transition cursor-pointer ${
                              active
                                ? "text-teal-300"
                                : "text-white/55 hover:text-white"
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="brokers-subtab-pill"
                                className="absolute inset-0 rounded-full bg-teal-500/15 border border-teal-500/25"
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 36,
                                }}
                              />
                            )}
                            <span className="relative z-10">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Panel - cross-fades when switching sub-tabs. */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={selected.autoSync ? view : "upload"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                    >
                      {selected.autoSync && view === "autosync" ? (
                        <IBKRTab embedded />
                      ) : (
                        UploadPanel
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </LayoutGroup>
    </div>
  );
}
