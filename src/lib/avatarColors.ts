// Preset accent colours for the account avatar. Keyed by a short id we
// persist on the user; the gradient classes are shared between the nav
// avatar and the settings picker so they always match. Some presets are
// rewards — locked until the account reaches `minLevel` (earned via
// challenge XP).
export const AVATAR_COLORS: {
  id: string;
  label: string;
  gradient: string;
  minLevel: number;
}[] = [
  { id: "teal", label: "Teal", gradient: "from-teal-500/80 to-emerald-600/80", minLevel: 1 },
  { id: "blue", label: "Blue", gradient: "from-sky-500/80 to-indigo-600/80", minLevel: 1 },
  { id: "violet", label: "Violet", gradient: "from-violet-500/80 to-fuchsia-600/80", minLevel: 1 },
  { id: "rose", label: "Rose", gradient: "from-rose-500/80 to-pink-600/80", minLevel: 1 },
  { id: "amber", label: "Amber", gradient: "from-amber-500/80 to-orange-600/80", minLevel: 1 },
  { id: "slate", label: "Slate", gradient: "from-slate-500/80 to-slate-700/80", minLevel: 1 },
  // Rewards
  { id: "gold", label: "Gold", gradient: "from-amber-300/90 to-yellow-600/90", minLevel: 2 },
  { id: "crimson", label: "Crimson", gradient: "from-red-500/85 to-rose-700/85", minLevel: 3 },
  { id: "aurora", label: "Aurora", gradient: "from-emerald-400/80 via-teal-400/80 to-indigo-500/80", minLevel: 4 },
  { id: "ocean", label: "Ocean", gradient: "from-cyan-400/85 to-blue-600/85", minLevel: 5 },
  { id: "nebula", label: "Nebula", gradient: "from-fuchsia-500/85 via-purple-500/85 to-indigo-600/85", minLevel: 7 },
];

const DEFAULT = AVATAR_COLORS[0].gradient;

export function avatarGradient(id?: string | null): string {
  return AVATAR_COLORS.find((c) => c.id === id)?.gradient ?? DEFAULT;
}

export function avatarMinLevel(id?: string | null): number {
  return AVATAR_COLORS.find((c) => c.id === id)?.minLevel ?? 1;
}
