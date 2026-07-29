// Accent colour packs — an app-wide reward that recolours the whole UI.
// The app is built on Tailwind `teal-*` (and companion `emerald-*`)
// utilities, which compile to `var(--color-teal-*)`. Selecting an accent
// sets `data-accent` on <html>; globals.css then remaps those variables
// for the chosen pack, so every button, link, active state, ring and chip
// follows along — the same trick the light theme uses.
//
// Packs are rewards: locked until the account reaches `minLevel` (earned
// via challenge XP). `teal` is the default and needs no CSS override.
export const ACCENTS: {
  id: string;
  label: string;
  minLevel: number;
  // Preview swatch for the settings picker. Uses the pack's *own* hue
  // utilities (not the remapped teal slot) so previews always show true
  // colours regardless of the active accent.
  swatch: string;
}[] = [
  { id: "teal", label: "Teal", minLevel: 1, swatch: "from-teal-400 to-emerald-400" },
  { id: "violet", label: "Violet", minLevel: 1, swatch: "from-violet-400 to-fuchsia-400" },
  { id: "ocean", label: "Ocean", minLevel: 1, swatch: "from-blue-400 to-cyan-400" },
  // Rewards
  { id: "rose", label: "Rose", minLevel: 2, swatch: "from-rose-400 to-pink-400" },
  { id: "sunset", label: "Sunset", minLevel: 3, swatch: "from-amber-400 to-orange-400" },
  { id: "forest", label: "Forest", minLevel: 4, swatch: "from-emerald-400 to-green-400" },
  { id: "ice", label: "Ice", minLevel: 6, swatch: "from-cyan-300 to-sky-400" },
  { id: "midnight", label: "Midnight", minLevel: 8, swatch: "from-indigo-400 to-violet-400" },
];

const DEFAULT_ACCENT = "teal";

export function accentSwatch(id?: string | null): string {
  return ACCENTS.find((a) => a.id === id)?.swatch ?? ACCENTS[0].swatch;
}

export function accentMinLevel(id?: string | null): number {
  return ACCENTS.find((a) => a.id === id)?.minLevel ?? 1;
}

// Normalise an arbitrary stored value to a known accent id.
export function normalizeAccent(id?: string | null): string {
  return ACCENTS.some((a) => a.id === id) ? (id as string) : DEFAULT_ACCENT;
}
