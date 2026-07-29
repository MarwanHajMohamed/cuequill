// Challenges & rewards — a curated set of process-focused goals evaluated
// from the user's real (non-simulated) trades. Kept pure and dependency-
// free so the same definitions run on the server (evaluate + verify a
// claim) and the client (render progress). Rewards are XP, which drives a
// level + title and unlocks cosmetic avatar colours.

export type ChallengeCategory =
  | "onboarding"
  | "journaling"
  | "discipline"
  | "exploration";

// The minimal trade shape the evaluators read.
export type EvalTrade = {
  status: "OPEN" | "WIN" | "LOSS";
  symbol?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  strategy?: string | null;
  dateBought?: string | Date | null;
  dateClosed?: string | Date | null;
};

export type ChallengeDef = {
  id: string;
  title: string;
  description: string;
  icon: string; // Font Awesome class
  category: ChallengeCategory;
  target: number;
  xp: number;
  // Level required before the challenge can be worked on / claimed. Locked
  // challenges are shown but greyed until the account reaches this level.
  minLevel?: number;
  // Current progress toward `target` (may exceed it). Complete when >=.
  progress: (trades: EvalTrade[]) => number;
};

const isClosed = (t: EvalTrade) => t.status === "WIN" || t.status === "LOSS";
const day = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";
const month = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 7) : "";

// Closed trades ordered by exit day — used by streak/sequence checks.
function closedByExit(trades: EvalTrade[]): EvalTrade[] {
  return trades
    .filter(isClosed)
    .slice()
    .sort((a, b) => {
      const ax = day(a.dateClosed ?? a.dateBought);
      const bx = day(b.dateClosed ?? b.dateBought);
      return ax < bx ? -1 : ax > bx ? 1 : 0;
    });
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: "first-trade",
    title: "First step",
    description: "Log your first trade in the journal.",
    icon: "fa-solid fa-flag-checkered",
    category: "onboarding",
    target: 1,
    xp: 50,
    progress: (t) => Math.min(t.length, 1),
  },
  {
    id: "ten-trades",
    title: "Getting the habit",
    description: "Log 10 trades.",
    icon: "fa-solid fa-list-ol",
    category: "onboarding",
    target: 10,
    xp: 100,
    progress: (t) => t.length,
  },
  {
    id: "century-club",
    title: "Century club",
    description: "Log 100 trades — a real sample size to learn from.",
    icon: "fa-solid fa-award",
    category: "journaling",
    target: 100,
    xp: 300,
    progress: (t) => t.length,
  },
  {
    id: "note-taker",
    title: "Note taker",
    description: "Add notes to 20 trades. Context beats memory.",
    icon: "fa-solid fa-pen-nib",
    category: "journaling",
    target: 20,
    xp: 150,
    progress: (t) => t.filter((x) => (x.notes ?? "").trim().length > 0).length,
  },
  {
    id: "well-tagged",
    title: "Well tagged",
    description: "Tag 25 trades so your stats can find patterns.",
    icon: "fa-solid fa-tags",
    category: "journaling",
    target: 25,
    xp: 150,
    progress: (t) => t.filter((x) => (x.tags?.length ?? 0) > 0).length,
  },
  {
    id: "bounce-back",
    title: "Bounce back",
    description:
      "Log a winning trade right after two losses in a row — no revenge trade.",
    icon: "fa-solid fa-arrow-trend-up",
    category: "discipline",
    target: 1,
    xp: 150,
    progress: (t) => {
      const seq = closedByExit(t);
      for (let i = 2; i < seq.length; i++) {
        if (
          seq[i].status === "WIN" &&
          seq[i - 1].status === "LOSS" &&
          seq[i - 2].status === "LOSS"
        ) {
          return 1;
        }
      }
      return 0;
    },
  },
  {
    id: "strategist",
    title: "Strategist",
    description: "Log trades across 3 different strategies.",
    icon: "fa-solid fa-bezier-curve",
    category: "exploration",
    target: 3,
    xp: 150,
    progress: (t) =>
      new Set(
        t
          .map((x) => (x.strategy ?? "").trim())
          .filter((s) => s.length > 0),
      ).size,
  },
  {
    id: "consistency",
    title: "In it for the long run",
    description: "Log trades in 3 different months.",
    icon: "fa-solid fa-calendar-check",
    category: "exploration",
    target: 3,
    xp: 200,
    progress: (t) =>
      new Set(
        t.map((x) => month(x.dateClosed ?? x.dateBought)).filter(Boolean),
      ).size,
  },
  {
    id: "diversified",
    title: "Diversified",
    description: "Trade 5 different symbols.",
    icon: "fa-solid fa-layer-group",
    category: "exploration",
    target: 5,
    xp: 200,
    progress: (t) =>
      new Set(
        t.map((x) => (x.symbol ?? "").trim().toUpperCase()).filter(Boolean),
      ).size,
  },
  {
    id: "marathon",
    title: "Marathon",
    description: "Log 250 trades — you're building a serious record.",
    icon: "fa-solid fa-person-running",
    category: "journaling",
    target: 250,
    xp: 400,
    progress: (t) => t.length,
  },
  {
    id: "deep-notes",
    title: "Deep notes",
    description: "Add notes to 50 trades.",
    icon: "fa-solid fa-book",
    category: "journaling",
    target: 50,
    xp: 250,
    progress: (t) => t.filter((x) => (x.notes ?? "").trim().length > 0).length,
  },
  // ── Level-gated challenges ──────────────────────────────────────────
  {
    id: "tag-master",
    title: "Tag master",
    description: "Tag 100 trades so every stat has something to slice.",
    icon: "fa-solid fa-tag",
    category: "journaling",
    target: 100,
    xp: 300,
    minLevel: 2,
    progress: (t) => t.filter((x) => (x.tags?.length ?? 0) > 0).length,
  },
  {
    id: "process-streak",
    title: "By the book",
    description:
      "Log 10 trades in a row that each have both a note and a tag.",
    icon: "fa-solid fa-clipboard-check",
    category: "discipline",
    target: 10,
    xp: 300,
    minLevel: 2,
    progress: (t) => {
      const seq = closedByExit(t);
      let best = 0;
      let run = 0;
      for (const x of seq) {
        const ok =
          (x.notes ?? "").trim().length > 0 && (x.tags?.length ?? 0) > 0;
        run = ok ? run + 1 : 0;
        if (run > best) best = run;
      }
      return best;
    },
  },
  {
    id: "half-and-half",
    title: "Above water",
    description: "Reach a 50% win rate over at least 30 closed trades.",
    icon: "fa-solid fa-scale-balanced",
    category: "discipline",
    target: 1,
    xp: 250,
    minLevel: 2,
    progress: (t) => {
      const closed = t.filter(isClosed);
      if (closed.length < 30) return 0;
      const wins = closed.filter((x) => x.status === "WIN").length;
      return wins / closed.length >= 0.5 ? 1 : 0;
    },
  },
  {
    id: "veteran",
    title: "Veteran",
    description: "Log trades across 6 different months.",
    icon: "fa-solid fa-medal",
    category: "exploration",
    target: 6,
    xp: 350,
    minLevel: 3,
    progress: (t) =>
      new Set(
        t.map((x) => month(x.dateClosed ?? x.dateBought)).filter(Boolean),
      ).size,
  },
];

export const CHALLENGE_MAP: Record<string, ChallengeDef> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);

// ── Levels ───────────────────────────────────────────────────────────
export const XP_PER_LEVEL = 300;
const TITLES = [
  "Novice",
  "Apprentice",
  "Journeyman",
  "Practitioner",
  "Disciplined",
  "Strategist",
  "Master",
];

export type LevelInfo = {
  level: number; // 1-based
  title: string;
  into: number; // XP earned within the current level
  per: number; // XP needed to fill a level
  totalXp: number;
};

export function levelInfo(xp: number): LevelInfo {
  const totalXp = Math.max(0, Math.floor(xp || 0));
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const into = totalXp % XP_PER_LEVEL;
  const title = TITLES[Math.min(level - 1, TITLES.length - 1)];
  return { level, title, into, per: XP_PER_LEVEL, totalXp };
}
