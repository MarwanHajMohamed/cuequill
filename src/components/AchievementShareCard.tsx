import React, { forwardRef } from "react";
import { DM_Sans } from "next/font/google";
import { type CardSkin, skinById } from "@/lib/cardSkins";

// Match the app's typeface (DM Sans) so the exported card reads as Cuequill.
const dmSans = DM_Sans({
  subsets: ["latin"],
});

// A self-contained, PNG-capturable share card for a challenge milestone:
// either a "level up" or a "challenge complete". Same family as the trade /
// month cards - the metallic Cuequill quill in the header, light, widely
// tracked type - painted with a skin so every colour is literal and the
// export looks identical in any app theme. All iconography is inline SVG
// (the capture runs with skipFonts, so Font Awesome would not render).

export const CARD_W = 600;
export const CARD_H = 300;

export type AchievementShareData =
  | { kind: "level"; level: number; title: string; totalXp: number }
  | {
      kind: "challenge";
      title: string;
      description: string;
      xp: number;
      level: number;
      levelTitle: string;
    };

const AchievementShareCard = forwardRef<
  HTMLDivElement,
  { data: AchievementShareData; skin?: CardSkin }
>(function AchievementShareCard({ data, skin: skinProp }, ref) {
  const skin = skinProp ?? skinById(null);
  const isLevel = data.kind === "level";
  const eyebrow = isLevel ? "Leveled up" : "Challenge complete";

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
        border: `1px solid ${skin.hair}`,
        overflow: "hidden",
        color: skin.ink,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "26px 30px",
      }}
    >
      {/* Header: brand + achievement label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandQuill size={26} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 300,
              letterSpacing: "0.22em",
              textIndent: "0.22em",
              color: skin.ink,
            }}
          >
            Cuequill
          </span>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 300,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: skin.muted,
          }}
        >
          {eyebrow}
        </span>
      </div>

      {/* Middle: medallion + headline */}
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <Medallion skin={skin} data={data} />
        <div style={{ minWidth: 0, flex: 1 }}>
          {isLevel ? (
            <>
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                Level {data.level}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 20,
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  color: skin.accent,
                  lineHeight: 1.2,
                }}
              >
                {data.title}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 300,
                  letterSpacing: "0.02em",
                  lineHeight: 1.15,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {data.title}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 15,
                  fontWeight: 300,
                  letterSpacing: "0.02em",
                  color: skin.muted,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {data.description}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer tiles */}
      <div style={{ display: "flex", gap: 12 }}>
        {isLevel ? (
          <>
            <Tile label="Level" value={`${data.level}`} skin={skin} />
            <Tile label="Title" value={data.title} skin={skin} />
            <Tile
              label="Total XP"
              value={data.totalXp.toLocaleString()}
              skin={skin}
              accent
            />
          </>
        ) : (
          <>
            <Tile label="Challenge" value="Complete" skin={skin} />
            <Tile label="Rank" value={data.levelTitle} skin={skin} />
            <Tile label="Reward" value={`+${data.xp} XP`} skin={skin} accent />
          </>
        )}
      </div>
    </div>
  );
});

export default AchievementShareCard;

// Circular medallion. For a level-up it shows the level number; for a
// challenge it shows a check mark. Ring uses the skin's accent gradient.
function Medallion({
  skin,
  data,
}: {
  skin: CardSkin;
  data: AchievementShareData;
}) {
  const size = 120;
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: `conic-gradient(from 180deg, ${skin.accentSolid}, ${skin.accent}, ${skin.accentSolid})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 30px -6px ${skin.accentSolid}`,
      }}
    >
      <div
        style={{
          width: size - 12,
          height: size - 12,
          borderRadius: "50%",
          background: skin.logoInner,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {data.kind === "level" ? (
          <span
            style={{
              fontSize: 46,
              fontWeight: 400,
              letterSpacing: "0.02em",
              color: skin.ink,
              lineHeight: 1,
            }}
          >
            {data.level}
          </span>
        ) : (
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5L10 17.5L19 7"
              stroke={skin.accent}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  skin,
  accent,
}: {
  label: string;
  value: string;
  skin: CardSkin;
  accent?: boolean;
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
      <div
        style={{
          fontSize: 12,
          fontWeight: 300,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: skin.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: "0.01em",
          color: accent ? skin.accent : skin.ink,
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

// The Cuequill quill mark, rendered as a folded metallic silver blade with
// a teal brand dot at the base (shared design with the other share cards).
function BrandQuill({ size = 26 }: { size?: number }) {
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
