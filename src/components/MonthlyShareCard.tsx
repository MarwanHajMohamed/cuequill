import React, { forwardRef } from "react";
import { type CardSkin, skinById } from "@/lib/cardSkins";

// A self-contained, always-dark share card for a month's performance —
// same visual language as TradeShareCard (brand top-left, hero Net P/L on
// the right, stat tiles beneath) so trade and month shares feel like one
// family. Every colour is hard-coded because the app remaps theme vars in
// light mode; the exported PNG must look identical in any theme.

export const CARD_W = 600;
export const CARD_H = 300;

const fmtMoneySigned = (n: number) => {
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  const body = Number.isInteger(abs)
    ? abs.toLocaleString()
    : abs.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${sign}$${body}`;
};

export type MonthlyShareStats = {
  monthName: string; // e.g. "January"
  year: string; // e.g. "2025"
  netPL: number;
  trades: number;
  closed: number;
  wins: number;
  losses: number;
  winRate: number | null; // 0-100, null when nothing closed
  // Optional period overrides so the same card can present a week or a year,
  // not just a month. All default to the month presentation.
  title?: string; // big headline (defaults to monthName)
  periodLabel?: string; // header-right label (defaults to `${monthName} ${year}`)
  periodNoun?: string; // "month" | "week" | "year" — used in "N trades this ___"
};

const MonthlyShareCard = forwardRef<
  HTMLDivElement,
  { stats: MonthlyShareStats; skin?: CardSkin }
>(function MonthlyShareCard({ stats, skin: skinProp }, ref) {
    const skin = skinProp ?? skinById(null);
    const INK = skin.ink;
    const MUTED = skin.muted;
    const HAIR = skin.hair;
    const TEAL = skin.accent;
    const TEAL_SOLID = skin.accentSolid;
    const RED = skin.red;
    const LOGO_INNER = skin.logoInner;

    const hasClosed = stats.closed > 0;
    const positive = stats.netPL >= 0;
    const accent = !hasClosed ? TEAL : positive ? TEAL : RED;
    const record = `${stats.wins}W – ${stats.losses}L`;

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: skin.bg,
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
        {/* Header: brand + month */}
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
          <span style={{ fontSize: 13, color: MUTED }}>
            {stats.periodLabel ?? `${stats.monthName} ${stats.year}`}
          </span>
        </div>

        {/* Middle: month title / Net P/L + win rate */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ minWidth: 0, maxWidth: 300 }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {stats.title ?? stats.monthName}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 15,
                color: MUTED,
                lineHeight: 1.35,
              }}
            >
              {stats.trades} {stats.trades === 1 ? "trade" : "trades"} this{" "}
              {stats.periodNoun ?? "month"}
            </div>
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
              Net P/L
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
              {hasClosed ? fmtMoneySigned(stats.netPL) : "—"}
            </div>
            {stats.winRate != null && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  color: accent,
                }}
              >
                {stats.winRate.toFixed(0)}% win rate
              </div>
            )}
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ display: "flex", gap: 12 }}>
          <Stat label="Trades" value={`${stats.trades}`} skin={skin} />
          <Stat label="Closed" value={`${stats.closed}`} skin={skin} />
          <Stat label="Record" value={record} skin={skin} />
        </div>
      </div>
    );
  },
);

export default MonthlyShareCard;

function Stat({
  label,
  value,
  skin,
}: {
  label: string;
  value: string;
  skin: CardSkin;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: skin.tile,
        border: `1px solid ${skin.hair}`,
        borderRadius: 14,
        padding: "12px 10px 13px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: skin.muted, marginBottom: 5 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: skin.ink,
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

// Inlined Cuequill quill mark so the capture doesn't depend on an external
// asset or icon font.
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
