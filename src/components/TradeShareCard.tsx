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
export const CARD_H = 140;

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

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          fontFamily:
            "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          // Hue lives only on the left, fading out by ~60% across.
          background:
            `radial-gradient(80% 130% at 0% 50%, ${c.hue} 0%, rgba(12,12,17,0) 60%), ` +
            "linear-gradient(180deg, #14141b 0%, #0b0b0f 100%)",
          borderRadius: 0,
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
            padding: "16px 24px",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          {/* LEFT — symbol centered, brand pinned to bottom */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
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
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 0.45,
              }}
            >
              <QuillMark color={INK} size={18} />
            </div>
          </div>

          {/* RIGHT — return % + P/L */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
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
            {pct != null && isClosed && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: INK,
                }}
              >
                {fmtMoneySigned(net)}
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
function QuillMark({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="16 25 30 52" fill="none" aria-hidden>
      <path
        d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
        fill={color}
      />
    </svg>
  );
}
