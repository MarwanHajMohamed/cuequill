import React, { forwardRef } from "react";
import { DM_Sans } from "next/font/google";
import { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { type CardSkin, skinById } from "@/lib/cardSkins";

// The app-wide typeface (DM Sans), so the exported card matches the site.
const shareFont = DM_Sans({
  subsets: ["latin"],
});

// A self-contained, always-dark share card for a single trade. The layout
// is three balanced zones on one centered line - ticker on the left, the
// Cuequill quill mark in the middle, Net P/L (and return %) on the right -
// with the trade date tucked into the top-right corner. Type is light and
// widely tracked for an airy, editorial feel.
//
// Every colour is hard-coded (not Tailwind `white`/opacity utilities or
// theme vars) because the app remaps --color-white and the surface vars
// in light mode - the exported image must look identical in any theme.
// Only the skin's background is kept per-skin; the quill is a fixed
// metallic silver with a teal brand dot.

export const CARD_W = 600;
export const CARD_H = 270;

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

const parseDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

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

const TradeShareCard = forwardRef<
  HTMLDivElement,
  { trade: Trade; skin?: CardSkin }
>(function TradeShareCard({ trade, skin: skinProp }, ref) {
    const skin = skinProp ?? skinById(null);
    const INK = skin.ink;
    const MUTED = skin.muted;
    const HAIR = skin.hair;
    const TEAL = skin.accent;
    const RED = skin.red;

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
    const dateCorner = isClosed ? (closed ?? bought) : bought;

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          fontFamily: shareFont.style.fontFamily,
          // Skin-defined base + glow. Captured to PNG so it's always a
          // literal colour (identical in any app theme).
          background: skin.bg,
          borderRadius: 22,
          border: `1px solid ${HAIR}`,
          overflow: "hidden",
          color: INK,
          position: "relative",
        }}
      >
        {/* Date, tucked top-right */}
        {dateCorner && (
          <span
            style={{
              position: "absolute",
              top: 26,
              right: 34,
              fontSize: 15,
              fontWeight: 300,
              letterSpacing: "0.06em",
              color: MUTED,
            }}
          >
            {fmtLong(dateCorner)}
          </span>
        )}

        {/* Ticker, left, vertically centered */}
        <div
          style={{
            position: "absolute",
            left: 38,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            maxWidth: 230,
          }}
        >
          <span
            style={{
              fontSize: 52,
              fontWeight: 300,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              lineHeight: 1,
              whiteSpace: "nowrap",
              color: INK,
            }}
          >
            {trade.symbol || "-"}
          </span>
        </div>

        {/* Centered quill mark + wordmark */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BrandQuill size={138} />
          <span
            style={{
              marginTop: 14,
              fontSize: 14,
              fontWeight: 300,
              letterSpacing: "0.3em",
              textIndent: "0.3em",
              color: MUTED,
            }}
          >
            Cuequill
          </span>
        </div>

        {/* Net P/L + return %, right, vertically centered */}
        <div
          style={{
            position: "absolute",
            right: 38,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            textAlign: "right",
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 300,
              letterSpacing: "0.02em",
              lineHeight: 1,
              whiteSpace: "nowrap",
              color: accent,
            }}
          >
            {isClosed ? fmtMoneySigned(net) : "Open"}
          </span>
          {pct != null && (
            <span
              style={{
                marginTop: 10,
                fontSize: 25,
                fontWeight: 300,
                letterSpacing: "0.03em",
                lineHeight: 1,
                color: accent,
              }}
            >
              {pct >= 0 ? "+" : ""}
              {pct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    );
  },
);

export default TradeShareCard;

// The Cuequill quill mark, rendered as a folded metallic silver blade with
// a teal brand dot at the base - inlined so the capture doesn't depend on
// an external asset or icon font. The two halves carry slightly different
// vertical gradients so the central spine reads as a crease. The dot keeps
// the brand teal across every skin (matching the reference design).
function BrandQuill({ size = 138 }: { size?: number }) {
  const w = (size * 80) / 176;
  const rid = React.useId().replace(/[:]/g, "");
  const gl = `ql-${rid}`;
  const gr = `qr-${rid}`;
  return (
    <svg width={w} height={size} viewBox="0 0 80 176" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gl} x1="40" y1="6" x2="40" y2="152" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e2e7ee" />
          <stop offset="1" stopColor="#bcc4d0" />
        </linearGradient>
        <linearGradient id={gr} x1="40" y1="6" x2="40" y2="152" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e7ebf1" />
          <stop offset="0.55" stopColor="#c2cad5" />
          <stop offset="1" stopColor="#929bab" />
        </linearGradient>
      </defs>
      <path d="M40 6 C 22 48 8 98 40 152 L 40 6 Z" fill={`url(#${gl})`} />
      <path d="M40 6 C 58 48 72 98 40 152 L 40 6 Z" fill={`url(#${gr})`} />
      <circle cx="40" cy="163" r="5" fill="#2dd4bf" />
    </svg>
  );
}
