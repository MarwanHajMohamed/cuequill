// Preset accent colours for the account avatar. Keyed by a short id we
// persist on the user; the gradient classes are shared between the nav
// avatar and the settings picker so they always match. Some presets are
// rewards — locked until the account reaches `minLevel` (earned via
// challenge XP).
//
// The teal/emerald-based presets (teal, aurora) use literal-hex Tailwind
// utilities (`from-[#…]`) instead of `from-teal-*` on purpose: the app-wide
// accent packs remap --color-teal-*/--color-emerald-*, and an avatar the
// user explicitly picked must stay that colour regardless of the accent.
export const AVATAR_COLORS: {
  id: string;
  label: string;
  gradient: string;
  minLevel: number;
}[] = [
  { id: "teal", label: "Teal", gradient: "from-[#14b8a6]/80 to-[#059669]/80", minLevel: 1 },
  { id: "blue", label: "Blue", gradient: "from-sky-500/80 to-indigo-600/80", minLevel: 1 },
  { id: "violet", label: "Violet", gradient: "from-violet-500/80 to-fuchsia-600/80", minLevel: 1 },
  { id: "rose", label: "Rose", gradient: "from-rose-500/80 to-pink-600/80", minLevel: 1 },
  { id: "amber", label: "Amber", gradient: "from-amber-500/80 to-orange-600/80", minLevel: 1 },
  { id: "slate", label: "Slate", gradient: "from-slate-500/80 to-slate-700/80", minLevel: 1 },
  // Rewards — unlock levels spread across the ladder (one reward per level).
  { id: "gold", label: "Gold", gradient: "from-amber-300/90 to-yellow-600/90", minLevel: 2 },
  { id: "crimson", label: "Crimson", gradient: "from-red-500/85 to-rose-700/85", minLevel: 7 },
  { id: "aurora", label: "Aurora", gradient: "from-[#34d399]/80 via-[#2dd4bf]/80 to-indigo-500/80", minLevel: 13 },
  { id: "ocean", label: "Ocean", gradient: "from-cyan-400/85 to-blue-600/85", minLevel: 18 },
  { id: "nebula", label: "Nebula", gradient: "from-fuchsia-500/85 via-purple-500/85 to-indigo-600/85", minLevel: 24 },
  { id: "ember", label: "Ember", gradient: "from-orange-500/85 to-red-600/85", minLevel: 29 },
  { id: "orchid", label: "Orchid", gradient: "from-fuchsia-400/85 to-purple-600/85", minLevel: 33 },
];

const DEFAULT = AVATAR_COLORS[0].gradient;

export function avatarGradient(id?: string | null): string {
  return AVATAR_COLORS.find((c) => c.id === id)?.gradient ?? DEFAULT;
}

export function avatarMinLevel(id?: string | null): number {
  return AVATAR_COLORS.find((c) => c.id === id)?.minLevel ?? 1;
}
