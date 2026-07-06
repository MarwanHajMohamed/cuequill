import React, { forwardRef } from "react";
import { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

// A self-contained, always-dark share card for a single trade. Brand +
// date on top, symbol and hold window on the left, Net P/L and return %
// on the right, and a row of stat tiles beneath. Rendered at a fixed
// size and snapshotted at a higher pixelRatio for a crisp PNG.
//
// Every colour is hard-coded (not Tailwind `white`/opacity utilities or
// theme vars) because the app remaps --color-white and the surface vars
// in light mode — the exported image must look identical in any theme.

export const CARD_W = 600;
export const CARD_H = 300;

const fmtMoneySigned = (n: number) => {
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  // Whole dollars read cleaner on the hero number; keep cents only when
  // there are any.
  const body =
    Number.isInteger(abs)
      ? abs.toLocaleString()
      : abs.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return `${sign}$${body}`;
};

const fmtPrice = (n?: number | null) =>
  n == null
    ? "—"
    : `$${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const parseDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const fmtLong = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export type ShareOutcome = "WIN" | "LOSS" | "OPEN";

// Per-contract return %, the natural win/loss percentage for an option
// trade: (exit − entry) / entry. Null when it can't be computed.
export function tradeReturnPct(t: Trade): number | null {
  if (t.status === "OPEN") return null;
  if (t.contractPrice == null || t.contractPrice === 0) return null;
  if (t.closingContractPrice == null) return null;
  return ((t.closingContractPrice - t.contractPrice) / t.contractPrice) * 100;
}

const INK = "#f4f4f5";
const MUTED = "#8a94a3";
const HAIR = "rgba(255,255,255,0.08)";
const TEAL = "#5eead4";
const TEAL_SOLID = "#2dd4bf";
const RED = "#f87171";
// Dark base used to punch the quill's inner line/dot through the mark.
const LOGO_INNER = "#0c141b";

const TradeShareCard = forwardRef<HTMLDivElement, { trade: Trade }>(
  function TradeShareCard({ trade }, ref) {
    const outcome: ShareOutcome =
      trade.status === "WIN" || trade.status === "LOSS"
        ? trade.status
        : "OPEN";
    const isClosed = outcome !== "OPEN";
    const net = tradeNetPL(trade);
    const pct = tradeReturnPct(trade);
    const positive = net >= 0;
    const accent = !isClosed ? TEAL : positive ? TEAL : RED;

    const bought = parseDate(trade.dateBought);
    const closed = parseDate(trade.dateClosed);
    const dateCorner = closed ?? bought;
    const heldDays =
      bought && closed
        ? Math.max(
            0,
            Math.round(
              (closed.getTime() - bought.getTime()) / 86_400_000,
            ),
          )
        : null;

    const subtitle = isClosed
      ? bought && closed
        ? `${fmtShort(bought)} → ${fmtShort(closed)}${
            heldDays != null
              ? ` · ${heldDays} ${heldDays === 1 ? "day" : "days"} held`
              : ""
          }`
        : bought
          ? `Closed ${fmtShort(bought)}`
          : ""
      : bought
        ? `Opened ${fmtShort(bought)}`
        : "";

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          // Dark navy-teal base with a soft teal glow in the top-right.
          background:
            "radial-gradient(90% 130% at 88% 0%, rgba(45,212,191,0.18) 0%, rgba(10,15,20,0) 55%), " +
            "linear-gradient(155deg, #0f1a20 0%, #0b1116 55%, #090c10 100%)",
          borderRadius: 22,
          border: `1px solid ${HAIR}`,
          overflow: "hidden",
          color: INK,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "26px 30px",
        }}
      >
        {/* Header: brand + date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <QuillLogo size={20} color={TEAL_SOLID} inner={LOGO_INNER} />
            <span
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: TEAL,
              }}
            >
              Cuequill
            </span>
          </div>
          {dateCorner && (
            <span style={{ fontSize: 13, color: MUTED }}>
              {fmtLong(dateCorner)}
            </span>
          )}
        </div>

        {/* Middle: symbol + hold window / Net P/L + % */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ minWidth: 0, maxWidth: 320 }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {trade.symbol || "—"}
            </div>
            {subtitle && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 15,
                  color: MUTED,
                  lineHeight: 1.35,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              {isClosed ? "Net P/L" : "Status"}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                color: accent,
              }}
            >
              {isClosed ? fmtMoneySigned(net) : "Open"}
            </div>
            {pct != null && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  color: accent,
                }}
              >
                {pct >= 0 ? "+" : ""}
                {pct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ display: "flex", gap: 12 }}>
          <Stat label="Entry" value={fmtPrice(trade.contractPrice)} />
          <Stat
            label="Exit"
            value={isClosed ? fmtPrice(trade.closingContractPrice) : "—"}
          />
          <Stat label="Qty" value={trade.qty != null ? `${trade.qty}` : "—"} />
        </div>
      </div>
    );
  },
);

export default TradeShareCard;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "rgba(255,255,255,0.035)",
        border: `1px solid ${HAIR}`,
        borderRadius: 14,
        padding: "12px 10px 13px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 5 }}>{label}</div>
      <div
        style={{
          fontSize: 18,
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

// The actual Cuequill quill mark (from the marketing logo), inlined so
// the capture doesn't depend on an external asset or icon font. The
// inner line + dot are punched through with the card's dark base
// instead of var(--background) so they render correctly in the export
// regardless of the viewer's theme.
function QuillLogo({
  size = 20,
  color,
  inner,
}: {
  size?: number;
  color: string;
  inner: string;
}) {
  return (
    <svg
      width={(size * 30) / 52}
      height={size}
      viewBox="16 25 30 52"
      fill="none"
      aria-hidden
    >
      <path
        d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
        fill={color}
      />
      <path
        d="M31 47V75"
        stroke={inner}
        strokeWidth="1.32"
        strokeLinecap="round"
      />
      <path
        d="M31 54.56C31.8616 54.56 32.56 53.8616 32.56 53C32.56 52.1384 31.8616 51.44 31 51.44C30.1384 51.44 29.44 52.1384 29.44 53C29.44 53.8616 30.1384 54.56 31 54.56Z"
        fill={inner}
      />
    </svg>
  );
}
