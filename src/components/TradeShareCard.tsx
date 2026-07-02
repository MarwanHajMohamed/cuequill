import React, { forwardRef } from "react";
import { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

// A self-contained, always-dark share card for a single trade. Rendered
// at a fixed 360px width and snapshotted at a higher pixelRatio to
// produce a crisp, aesthetically appealing PNG.
//
// Every colour is hard-coded (not Tailwind `white`/opacity utilities or
// theme vars) because the app remaps --color-white and the surface vars
// in light mode — the exported image must look identical regardless of
// the user's theme.

const fmtMoneySigned = (n: number) => {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fmtPrice = (n?: number | null) =>
  n == null ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type ShareOutcome = "WIN" | "LOSS" | "OPEN";

// Per-contract return %, the natural win/loss percentage for an option
// trade: (exit − entry) / entry. Null when it can't be computed (open,
// or no entry price).
export function tradeReturnPct(t: Trade): number | null {
  if (t.status === "OPEN") return null;
  if (t.contractPrice == null || t.contractPrice === 0) return null;
  if (t.closingContractPrice == null) return null;
  return ((t.closingContractPrice - t.contractPrice) / t.contractPrice) * 100;
}

const PALETTE: Record<
  ShareOutcome,
  { accent: string; glow: string; pill: string; pillText: string; label: string }
> = {
  WIN: {
    accent: "#22c55e",
    glow: "rgba(34,197,94,0.22)",
    pill: "rgba(34,197,94,0.15)",
    pillText: "#4ade80",
    label: "WIN",
  },
  LOSS: {
    accent: "#ef4444",
    glow: "rgba(239,68,68,0.20)",
    pill: "rgba(239,68,68,0.15)",
    pillText: "#f87171",
    label: "LOSS",
  },
  OPEN: {
    accent: "#2dd4bf",
    glow: "rgba(45,212,191,0.18)",
    pill: "rgba(45,212,191,0.14)",
    pillText: "#5eead4",
    label: "OPEN",
  },
};

const INK = "#f4f4f5";
const MUTED = "#8b8b96";
const HAIR = "rgba(255,255,255,0.08)";

const TradeShareCard = forwardRef<HTMLDivElement, { trade: Trade }>(
  function TradeShareCard({ trade }, ref) {
    const outcome: ShareOutcome =
      trade.status === "WIN" || trade.status === "LOSS"
        ? trade.status
        : "OPEN";
    const c = PALETTE[outcome];
    const net = tradeNetPL(trade);
    const pct = tradeReturnPct(trade);
    const isClosed = outcome !== "OPEN";
    const isCall = trade.option === "CALL";

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background:
            `radial-gradient(120% 80% at 50% -10%, ${c.glow} 0%, rgba(12,12,17,0) 60%), ` +
            "linear-gradient(180deg, #131319 0%, #0c0c11 100%)",
          borderRadius: 24,
          border: `1px solid ${HAIR}`,
          overflow: "hidden",
          color: INK,
          position: "relative",
        }}
      >
        {/* Accent hairline at the very top */}
        <div style={{ height: 3, width: "100%", background: c.accent }} />

        <div style={{ padding: "22px 24px 24px" }}>
          {/* Brand + status pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <QuillMark color={c.accent} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  color: INK,
                }}
              >
                CUEQUILL
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: c.pillText,
                background: c.pill,
                border: `1px solid ${c.accent}55`,
                borderRadius: 999,
                padding: "4px 10px",
              }}
            >
              {c.label}
            </span>
          </div>

          {/* Symbol + contract */}
          <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {trade.symbol || "—"}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: isCall ? "#4ade80" : "#f87171",
              }}
            >
              {trade.strike ? `${trade.strike} ` : ""}
              {trade.option}
            </span>
          </div>

          {/* Hero: return % (or status for open) + net $ */}
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                color: c.accent,
              }}
            >
              {pct == null
                ? isClosed
                  ? fmtMoneySigned(net)
                  : "Open"
                : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
            </div>
            {pct != null && (
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 600, color: INK }}>
                {fmtMoneySigned(net)}
                <span style={{ color: MUTED, fontWeight: 500 }}> net P/L</span>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: `1px solid ${HAIR}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              rowGap: 16,
              columnGap: 12,
            }}
          >
            <Stat label="Entry" value={fmtPrice(trade.contractPrice)} />
            <Stat
              label="Exit"
              value={isClosed ? fmtPrice(trade.closingContractPrice) : "—"}
            />
            <Stat label="Qty" value={trade.qty ? `${trade.qty}` : "—"} />
            <Stat label="Strategy" value={trade.strategy || "—"} />
            <Stat label="Opened" value={fmtDate(trade.dateBought)} />
            <Stat
              label="Closed"
              value={isClosed ? fmtDate(trade.dateClosed) : "—"}
            />
          </div>

          {/* Tags */}
          {trade.tags && trade.tags.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {trade.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    color: "#c7c7d1",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${HAIR}`,
                    borderRadius: 999,
                    padding: "3px 9px",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 14,
              borderTop: `1px solid ${HAIR}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 11, color: MUTED, letterSpacing: "0.04em" }}>
              Journaled with Cuequill
            </span>
            <span style={{ fontSize: 11, color: MUTED }}>cuequill.com</span>
          </div>
        </div>
      </div>
    );
  },
);

export default TradeShareCard;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: MUTED,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: INK,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// Inline quill mark (simplified from the marketing logo) so the capture
// doesn't depend on an icon font.
function QuillMark({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="16 25 30 52" fill="none" aria-hidden>
      <path
        d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
        fill={color}
      />
    </svg>
  );
}
