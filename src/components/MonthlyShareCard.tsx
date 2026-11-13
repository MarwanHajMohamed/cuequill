import React, { forwardRef } from "react";
import { DM_Sans } from "next/font/google";
import { type CardSkin, skinById } from "@/lib/cardSkins";
import { QUILL_LOGO_SRC, QUILL_LOGO_RATIO } from "@/lib/quillLogo";

// Match the app's typeface (DM Sans) so the exported card reads as Cuequill.
const dmSans = DM_Sans({
  subsets: ["latin"],
});

// A self-contained, always-dark share card for a period's performance -
// same visual language as TradeShareCard (period title left, centered quill
// mark, Net P/L right, label top-right) so trade and month shares feel like
// one family. Every colour is hard-coded because the app remaps theme vars
// in light mode; the exported PNG must look identical in any theme. Only the
// skin's background is per-skin - the quill is a fixed metallic silver with
// a teal brand dot.

export const CARD_W = 600;
export const CARD_H = 270;

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
  periodNoun?: string; // "month" | "week" | "year" - used in "N trades this ___"
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
    const RED = skin.red;

    const hasClosed = stats.closed > 0;
    const positive = stats.netPL >= 0;
    const accent = !hasClosed ? TEAL : positive ? TEAL : RED;

    const title = stats.title ?? stats.monthName;
    const cornerLabel = stats.periodLabel ?? `${stats.monthName} ${stats.year}`;
    const noun = stats.periodNoun ?? "month";

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          boxSizing: "border-box",
          fontFamily: dmSans.style.fontFamily,
          background: skin.bg,
          borderRadius: 22,
          border: `1px solid ${HAIR}`,
          overflow: "hidden",
          color: INK,
          position: "relative",
        }}
      >
        {/* Period label, tucked top-right */}
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
          {cornerLabel}
        </span>

        {/* Period title + trade count, left, vertically centered */}
        <div
          style={{
            position: "absolute",
            left: 38,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 230,
          }}
        >
          <span
            style={{
              fontSize: 42,
              fontWeight: 200,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              lineHeight: 1.05,
              color: INK,
              overflowWrap: "break-word",
            }}
          >
            {title}
          </span>
          <span
            style={{
              marginTop: 12,
              fontSize: 14,
              fontWeight: 300,
              letterSpacing: "0.04em",
              color: MUTED,
            }}
          >
            {stats.trades} {stats.trades === 1 ? "trade" : "trades"} this {noun}
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
          <img
            src={QUILL_LOGO_SRC}
            alt=""
            style={{ height: 150, width: 150 * QUILL_LOGO_RATIO, display: "block" }}
          />
          <span
            style={{
              marginTop: 14,
              fontSize: 14,
              fontWeight: 200,
              letterSpacing: "0.3em",
              textIndent: "0.3em",
              color: MUTED,
            }}
          >
            Cuequill
          </span>
        </div>

        {/* Net P/L + win rate, right, vertically centered */}
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
            {hasClosed ? fmtMoneySigned(stats.netPL) : "-"}
          </span>
          {stats.winRate != null && (
            <span
              style={{
                marginTop: 10,
                fontSize: 22,
                fontWeight: 300,
                letterSpacing: "0.03em",
                lineHeight: 1,
                color: accent,
              }}
            >
              {stats.winRate.toFixed(0)}% win rate
            </span>
          )}
        </div>
      </div>
    );
  },
);

export default MonthlyShareCard;
