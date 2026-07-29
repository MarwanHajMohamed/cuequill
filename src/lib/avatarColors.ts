// Preset accent colours for the account avatar. Keyed by a short id we
// persist on the user; the gradient classes are shared between the nav
// avatar and the settings picker so they always match.
export const AVATAR_COLORS: { id: string; label: string; gradient: string }[] =
  [
    { id: "teal", label: "Teal", gradient: "from-teal-500/80 to-emerald-600/80" },
    { id: "blue", label: "Blue", gradient: "from-sky-500/80 to-indigo-600/80" },
    { id: "violet", label: "Violet", gradient: "from-violet-500/80 to-fuchsia-600/80" },
    { id: "rose", label: "Rose", gradient: "from-rose-500/80 to-pink-600/80" },
    { id: "amber", label: "Amber", gradient: "from-amber-500/80 to-orange-600/80" },
    { id: "slate", label: "Slate", gradient: "from-slate-500/80 to-slate-700/80" },
  ];

const DEFAULT = AVATAR_COLORS[0].gradient;

export function avatarGradient(id?: string | null): string {
  return AVATAR_COLORS.find((c) => c.id === id)?.gradient ?? DEFAULT;
}
