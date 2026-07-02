import React, { forwardRef } from "react";
import { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

// A self-contained, always-dark, wide share card for a single trade.
// Symbol on the left, return % and P/L on the right, tinted with a hue
// that reflects the outcome. Rendered at a fixed size and snapshotted at
// a higher pixelRatio for a crisp PNG.
//
// Colours are hard-coded (not Tailwind `white`/opacity utilities or
// theme vars) because the app remaps --color-white and the surface vars
// in light mode — the exported image must look identical in any theme.

export const CARD_W = 600;
export const CARD_H = 168;

const fmtMoneySigned = (n: number) => {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export type ShareOutcome = "WIN" | "LOSS" | "OPEN";

// Per-contract return %, the natural win/loss percentage for an option
// trade: (exit − entry) / entry. Null when it can't be computed.
export function tradeReturnPct(t: Trade): number | null {
  if (t.status === "OPEN") return null;
  if (t.contractPrice == null || t.contractPrice === 0) return null;
  if (t.closingContractPrice == null) return null;
  return ((t.closingContractPrice - t.contractPrice) / t.contractPrice) * 100;
}

const PALETTE: Record<ShareOutcome, { accent: string; hue: string }> = {
  WIN: { accent: "#22c55e", hue: "rgba(34,197,94,0.28)" },
  LOSS: { accent: "#ef4444", hue: "rgba(239,68,68,0.26)" },
  OPEN: { accent: "#2dd4bf", hue: "rgba(45,212,191,0.24)" },
};

const INK = "#f4f4f5";
const MUTED = "#8b8b96";
const HAIR = "rgba(255,255,255,0.09)";

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
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          // The hue: a broad diagonal wash plus a corner glow in the
          // outcome colour over a near-black base.
          background:
            `radial-gradient(90% 120% at 100% 0%, ${c.hue} 0%, rgba(12,12,17,0) 55%), ` +
            `linear-gradient(135deg, ${c.hue} 0%, rgba(12,12,17,0) 45%), ` +
            "linear-gradient(180deg, #14141b 0%, #0b0b0f 100%)",
          borderRadius: 26,
          border: `1px solid ${HAIR}`,
          overflow: "hidden",
          color: INK,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "20px 24px",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          {/* LEFT — brand + symbol */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <QuillMark color={c.accent} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: INK,
                }}
              >
                Cuequill
              </span>
            </div>

            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                {trade.symbol || "—"}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isCall ? "#4ade80" : "#f87171",
                }}
              >
                {trade.strike ? `${trade.strike} ` : ""}
                {trade.option}
              </div>
            </div>
          </div>

          {/* RIGHT — return % + P/L */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.02em",
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
            {(pct != null || isClosed) && (
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>
                <span style={{ color: pct != null ? INK : c.accent }}>
                  {fmtMoneySigned(net)}
                </span>
                <span style={{ color: MUTED, fontWeight: 500 }}> P/L</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export default TradeShareCard;

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
