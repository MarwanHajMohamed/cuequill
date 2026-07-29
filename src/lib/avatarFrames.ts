// Avatar frames — a second cosmetic reward tier beyond colours. A frame
// is a ring/glow drawn around the account avatar, unlocked by reaching a
// level. `ring` is a Tailwind class string (box-shadow based, so no
// ring-offset colour juggling) shared by the nav avatar and the settings
// picker.
export const AVATAR_FRAMES: {
  id: string;
  label: string;
  ring: string;
  minLevel: number;
}[] = [
  { id: "none", label: "None", ring: "", minLevel: 1 },
  {
    id: "glow",
    label: "Teal glow",
    ring: "shadow-[0_0_0_2px_rgba(45,212,191,0.6)]",
    minLevel: 2,
  },
  {
    id: "gold",
    label: "Gold ring",
    ring: "shadow-[0_0_0_2px_rgba(251,191,36,0.75)]",
    minLevel: 3,
  },
  {
    id: "aurora",
    label: "Aurora halo",
    ring: "shadow-[0_0_12px_2px_rgba(167,139,250,0.6)]",
    minLevel: 4,
  },
  {
    id: "prismatic",
    label: "Prismatic",
    ring: "shadow-[0_0_0_2px_rgba(45,212,191,0.7),0_0_14px_3px_rgba(129,140,248,0.5)]",
    minLevel: 6,
  },
];

export function avatarFrameRing(id?: string | null): string {
  return AVATAR_FRAMES.find((f) => f.id === id)?.ring ?? "";
}

export function avatarFrameMinLevel(id?: string | null): number {
  return AVATAR_FRAMES.find((f) => f.id === id)?.minLevel ?? 1;
}
