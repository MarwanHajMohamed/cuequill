import React, { forwardRef } from "react";
import { type CardSkin, skinById } from "@/lib/cardSkins";

// A self-contained, PNG-capturable share card for a challenge milestone:
// either a "level up" or a "challenge complete". Same 600×300 family as the
// trade / month cards, painted with a skin so every colour is literal and
// the export looks identical in any app theme. All iconography is inline
// SVG (the capture runs with skipFonts, so Font Awesome would not render).

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
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <QuillLogo size={20} color={skin.accentSolid} inner={skin.logoInner} />
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: skin.accent,
            }}
          >
            Cuequill
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: skin.muted,
          }}
        >
          {eyebrow}
        </span>
      </div>

      {/* Middle: medallion + headline */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Medallion skin={skin} data={data} />
        <div style={{ minWidth: 0, flex: 1 }}>
          {isLevel ? (
            <>
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                Level {data.level}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 20,
                  fontWeight: 600,
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
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
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
                  color: skin.muted,
                  lineHeight: 1.35,
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
              fontWeight: 800,
              letterSpacing: "-0.02em",
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
      <div style={{ fontSize: 12, color: skin.muted, marginBottom: 5 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
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

// Inlined Cuequill quill mark (shared with the other share cards).
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
