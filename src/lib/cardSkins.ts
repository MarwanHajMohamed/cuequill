// Share-card skins — the palette a share image (trade / month / achievement)
// is painted with. Cards are captured to PNG, so every value here is a
// literal colour (never a Tailwind theme var) and the exported image looks
// identical regardless of the viewer's app theme.
//
// Skins are cosmetic rewards: locked until the account reaches `minLevel`
// (earned via challenge XP). "midnight" is the default and reproduces the
// original always-dark card look exactly.

export type CardSkin = {
  id: string;
  label: string;
  minLevel: number;
  // Full CSS background (may layer a radial glow over a base gradient).
  bg: string;
  ink: string; // primary text
  muted: string; // secondary text
  hair: string; // hairlines / tile borders
  tile: string; // stat-tile fill
  accent: string; // positive P/L + brand wordmark (lighter shade)
  accentSolid: string; // logo mark fill (more saturated)
  red: string; // loss / negative
  logoInner: string; // punches the quill's inner line/dot; matches the base
  // Two-stop gradient for the picker swatch (literal hex → always accurate).
  swatchFrom: string;
  swatchTo: string;
};

export const CARD_SKINS: CardSkin[] = [
  {
    id: "midnight",
    label: "Midnight",
    minLevel: 1,
    bg:
      "radial-gradient(90% 130% at 88% 0%, rgba(45,212,191,0.18) 0%, rgba(10,15,20,0) 55%), " +
      "linear-gradient(155deg, #0f1a20 0%, #0b1116 55%, #090c10 100%)",
    ink: "#f4f4f5",
    muted: "#8a94a3",
    hair: "rgba(255,255,255,0.08)",
    tile: "rgba(255,255,255,0.035)",
    accent: "#5eead4",
    accentSolid: "#2dd4bf",
    red: "#f87171",
    logoInner: "#0c141b",
    swatchFrom: "#2dd4bf",
    swatchTo: "#0b1116",
  },
  {
    id: "slate",
    label: "Slate",
    minLevel: 1,
    bg:
      "radial-gradient(90% 130% at 88% 0%, rgba(148,163,184,0.16) 0%, rgba(15,17,22,0) 55%), " +
      "linear-gradient(155deg, #1b1f27 0%, #14171d 55%, #0f1114 100%)",
    ink: "#f1f5f9",
    muted: "#94a3b8",
    hair: "rgba(255,255,255,0.08)",
    tile: "rgba(255,255,255,0.04)",
    accent: "#cbd5e1",
    accentSolid: "#94a3b8",
    red: "#f87171",
    logoInner: "#14171d",
    swatchFrom: "#94a3b8",
    swatchTo: "#14171d",
  },
  {
    id: "ocean",
    label: "Ocean",
    minLevel: 2,
    bg:
      "radial-gradient(90% 130% at 88% 0%, rgba(56,189,248,0.22) 0%, rgba(8,14,22,0) 55%), " +
      "linear-gradient(155deg, #0d1a2b 0%, #0a1220 55%, #070c15 100%)",
    ink: "#f0f7ff",
    muted: "#7f95ad",
    hair: "rgba(255,255,255,0.08)",
    tile: "rgba(255,255,255,0.04)",
    accent: "#7dd3fc",
    accentSolid: "#38bdf8",
    red: "#fb7185",
    logoInner: "#0a1220",
    swatchFrom: "#38bdf8",
    swatchTo: "#0a1220",
  },
  {
    id: "sunset",
    label: "Sunset",
    minLevel: 3,
    bg:
      "radial-gradient(90% 130% at 88% 0%, rgba(251,146,60,0.22) 0%, rgba(22,14,8,0) 55%), " +
      "linear-gradient(155deg, #241611 0%, #1a1009 55%, #120b06 100%)",
    ink: "#fdf4ec",
    muted: "#b08a72",
    hair: "rgba(255,255,255,0.08)",
    tile: "rgba(255,255,255,0.04)",
    accent: "#fcd34d",
    accentSolid: "#fbbf24",
    red: "#fb7185",
    logoInner: "#1a1009",
    swatchFrom: "#fbbf24",
    swatchTo: "#1a1009",
  },
  {
    id: "violet",
    label: "Violet",
    minLevel: 4,
    bg:
      "radial-gradient(90% 130% at 88% 0%, rgba(167,139,250,0.24) 0%, rgba(15,10,24,0) 55%), " +
      "linear-gradient(155deg, #1c1430 0%, #140e24 55%, #0d0918 100%)",
    ink: "#f5f0ff",
    muted: "#9a8bc0",
    hair: "rgba(255,255,255,0.08)",
    tile: "rgba(255,255,255,0.045)",
    accent: "#c4b5fd",
    accentSolid: "#a78bfa",
    red: "#fb7185",
    logoInner: "#140e24",
    swatchFrom: "#a78bfa",
    swatchTo: "#140e24",
  },
  {
    id: "paper",
    label: "Paper",
    minLevel: 5,
    bg:
      "radial-gradient(90% 130% at 88% 0%, rgba(13,148,136,0.10) 0%, rgba(246,247,249,0) 55%), " +
      "linear-gradient(155deg, #ffffff 0%, #f6f7f9 55%, #eef0f3 100%)",
    ink: "#1f2937",
    muted: "#6b7280",
    hair: "rgba(2,6,23,0.10)",
    tile: "rgba(2,6,23,0.03)",
    accent: "#0d9488",
    accentSolid: "#0d9488",
    red: "#dc2626",
    logoInner: "#ffffff",
    swatchFrom: "#0d9488",
    swatchTo: "#f6f7f9",
  },
  {
    id: "mono",
    label: "Mono",
    minLevel: 6,
    bg: "linear-gradient(155deg, #202024 0%, #161619 55%, #101012 100%)",
    ink: "#f4f4f5",
    muted: "#a1a1aa",
    hair: "rgba(255,255,255,0.10)",
    tile: "rgba(255,255,255,0.05)",
    accent: "#e5e7eb",
    accentSolid: "#d4d4d8",
    red: "#fca5a5",
    logoInner: "#161619",
    swatchFrom: "#d4d4d8",
    swatchTo: "#161619",
  },
  {
    id: "gold",
    label: "Gold",
    minLevel: 8,
    bg:
      "radial-gradient(90% 130% at 88% 0%, rgba(234,179,8,0.20) 0%, rgba(10,8,4,0) 55%), " +
      "linear-gradient(155deg, #14110a 0%, #0d0b06 55%, #080703 100%)",
    ink: "#faf6ec",
    muted: "#a99968",
    hair: "rgba(212,175,55,0.16)",
    tile: "rgba(212,175,55,0.06)",
    accent: "#fcd34d",
    accentSolid: "#f59e0b",
    red: "#fb7185",
    logoInner: "#0d0b06",
    swatchFrom: "#f59e0b",
    swatchTo: "#0d0b06",
  },
];

const DEFAULT_SKIN = CARD_SKINS[0];

export function skinById(id?: string | null): CardSkin {
  return CARD_SKINS.find((s) => s.id === id) ?? DEFAULT_SKIN;
}

export function cardSkinMinLevel(id?: string | null): number {
  return CARD_SKINS.find((s) => s.id === id)?.minLevel ?? 1;
}

export function normalizeCardSkin(id?: string | null): string {
  return CARD_SKINS.some((s) => s.id === id) ? (id as string) : DEFAULT_SKIN.id;
}
