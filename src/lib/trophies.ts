// Milestone trophies & earned titles — status rewards (no XP, no claim)
// that sit alongside the claimable challenges. A trophy is auto-earned the
// moment its condition is met; some trophies also unlock a title the user
// can equip as a nameplate next to their name.

export type TrophyStats = {
  totalTrades: number;
  closedTrades: number;
  wins: number;
  months: number; // distinct calendar months traded
  symbols: number; // distinct symbols traded
  level: number;
  levelTitle: string;
  claimedCount: number;
  totalChallenges: number;
};

export type TrophyDef = {
  id: string;
  label: string;
  description: string;
  icon: string; // Font Awesome class
  // Title this trophy grants when earned (equippable nameplate).
  title?: string;
  earned: (s: TrophyStats) => boolean;
};

export const TROPHIES: TrophyDef[] = [
  {
    id: "first-blood",
    label: "First Blood",
    description: "Close your first winning trade.",
    icon: "fa-solid fa-droplet",
    earned: (s) => s.wins >= 1,
  },
  {
    id: "centurion",
    label: "Centurion",
    description: "Log 100 trades.",
    icon: "fa-solid fa-shield-halved",
    title: "Centurion",
    earned: (s) => s.totalTrades >= 100,
  },
  {
    id: "legionnaire",
    label: "Legionnaire",
    description: "Log 500 trades.",
    icon: "fa-solid fa-chess-rook",
    title: "Legionnaire",
    earned: (s) => s.totalTrades >= 500,
  },
  {
    id: "marksman",
    label: "Marksman",
    description: "Hold a 55%+ win rate over 50+ closed trades.",
    icon: "fa-solid fa-crosshairs",
    title: "Marksman",
    earned: (s) => s.closedTrades >= 50 && s.wins / s.closedTrades >= 0.55,
  },
  {
    id: "explorer",
    label: "Explorer",
    description: "Trade 10 different symbols.",
    icon: "fa-solid fa-compass",
    title: "Explorer",
    earned: (s) => s.symbols >= 10,
  },
  {
    id: "seasoned",
    label: "Seasoned",
    description: "Log trades across 12 different months.",
    icon: "fa-solid fa-hourglass-half",
    title: "Seasoned",
    earned: (s) => s.months >= 12,
  },
  {
    id: "disciplined",
    label: "Disciplined",
    description: "Reach level 5.",
    icon: "fa-solid fa-dumbbell",
    title: "Disciplined",
    earned: (s) => s.level >= 5,
  },
  {
    id: "completionist",
    label: "Completionist",
    description: "Claim every challenge.",
    icon: "fa-solid fa-crown",
    title: "Completionist",
    earned: (s) => s.totalChallenges > 0 && s.claimedCount >= s.totalChallenges,
  },
];

// Titles the user has earned and may equip as a nameplate: their current
// level title, plus any title granted by an earned trophy.
export function availableTitles(s: TrophyStats): string[] {
  const set = new Set<string>();
  if (s.levelTitle) set.add(s.levelTitle);
  for (const t of TROPHIES) {
    if (t.title && t.earned(s)) set.add(t.title);
  }
  return [...set];
}
