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
  option?: "CALL" | "PUT" | null;
  dateBought?: string | Date | null;
  dateClosed?: string | Date | null;
};

// A reward granted on top of XP when a challenge is claimed. Currently
// just bonus Quill AI messages — a small, finite pool (kept small on
// purpose since each message has a real cost).
export type ChallengeReward = { kind: "chat"; amount: number; label: string };

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
  // Optional bonus reward beyond XP.
  reward?: ChallengeReward;
  // Current progress toward `target` (may exceed it). Complete when >=.
  progress: (trades: EvalTrade[]) => number;
};

const isClosed = (t: EvalTrade) => t.status === "WIN" || t.status === "LOSS";
const day = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";
const month = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 7) : "";
// Distinct-week key: the Monday (UTC) of the week the date falls in.
const weekKey = (d?: string | Date | null) => {
  if (!d) return "";
  const dt = new Date(d);
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(dt);
  monday.setUTCDate(dt.getUTCDate() - dow);
  return monday.toISOString().slice(0, 10);
};

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

// Longest run of consecutive closed trades (by exit order) satisfying `ok`.
function longestRun(
  trades: EvalTrade[],
  ok: (t: EvalTrade) => boolean,
): number {
  let best = 0;
  let run = 0;
  for (const x of closedByExit(trades)) {
    run = ok(x) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

// Ongoing "activity XP" earned just by using the journal: 10 XP per logged
// (real) trade + 10 XP per distinct day journaled. Derived from the trade
// list so it's always current, retroactive and impossible to double-count.
export function activityXp(trades: EvalTrade[]): number {
  const days = new Set<string>();
  for (const t of trades) {
    const dk = day(t.dateClosed ?? t.dateBought);
    if (dk) days.add(dk);
  }
  return trades.length * 10 + days.size * 10;
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
    description: "Log 100 trades.",
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
    description: "Log a winning trade right after a loss - no revenge trade.",
    icon: "fa-solid fa-arrow-trend-up",
    category: "discipline",
    target: 1,
    xp: 150,
    progress: (t) => {
      const seq = closedByExit(t);
      for (let i = 1; i < seq.length; i++) {
        if (seq[i].status === "WIN" && seq[i - 1].status === "LOSS") {
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
    description: "Log 250 trades.",
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
    description: "Tag 100 trades.",
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
  // ── Expanded set ────────────────────────────────────────────────────
  {
    id: "storyteller",
    title: "Storyteller",
    description: "Write a detailed note (120+ characters) on 15 trades.",
    icon: "fa-solid fa-feather-pointed",
    category: "journaling",
    target: 15,
    xp: 200,
    progress: (t) =>
      t.filter((x) => (x.notes ?? "").trim().length >= 120).length,
  },
  {
    id: "tag-system",
    title: "Tag system",
    description: "Use 10 different tags across your journal.",
    icon: "fa-solid fa-hashtag",
    category: "journaling",
    target: 10,
    xp: 200,
    progress: (t) =>
      new Set(
        t.flatMap((x) =>
          (x.tags ?? [])
            .map((g) => g.trim().toLowerCase())
            .filter((g) => g.length > 0),
        ),
      ).size,
  },
  {
    id: "back-to-back",
    title: "Back-to-back reviews",
    description: "Log 20 closed trades in a row that each have a note.",
    icon: "fa-solid fa-pen-clip",
    category: "journaling",
    target: 20,
    xp: 250,
    progress: (t) => longestRun(t, (x) => (x.notes ?? "").trim().length > 0),
  },
  {
    id: "honest-book",
    title: "Honest book",
    description: "Log 25 losing trades — journal the bad ones too.",
    icon: "fa-solid fa-scale-unbalanced",
    category: "discipline",
    target: 25,
    xp: 200,
    progress: (t) => t.filter((x) => x.status === "LOSS").length,
  },
  {
    id: "by-the-book-2",
    title: "By the book II",
    description: "Log 25 trades in a row that each have both a note and a tag.",
    icon: "fa-solid fa-clipboard-list",
    category: "discipline",
    target: 25,
    xp: 350,
    minLevel: 4,
    progress: (t) =>
      longestRun(
        t,
        (x) => (x.notes ?? "").trim().length > 0 && (x.tags?.length ?? 0) > 0,
      ),
  },
  {
    id: "wide-net",
    title: "Wide net",
    description: "Trade 15 different symbols.",
    icon: "fa-solid fa-network-wired",
    category: "exploration",
    target: 15,
    xp: 250,
    progress: (t) =>
      new Set(
        t.map((x) => (x.symbol ?? "").trim().toUpperCase()).filter(Boolean),
      ).size,
  },
  {
    id: "strategy-library",
    title: "Strategy library",
    description: "Log trades across 5 different strategies.",
    icon: "fa-solid fa-book-bookmark",
    category: "exploration",
    target: 5,
    xp: 250,
    progress: (t) =>
      new Set(
        t.map((x) => (x.strategy ?? "").trim()).filter((s) => s.length > 0),
      ).size,
  },
  {
    id: "weekly-habit",
    title: "Weekly habit",
    description: "Log trades in 8 different calendar weeks.",
    icon: "fa-solid fa-calendar-week",
    category: "exploration",
    target: 8,
    xp: 250,
    progress: (t) =>
      new Set(
        t.map((x) => weekKey(x.dateClosed ?? x.dateBought)).filter(Boolean),
      ).size,
  },
  {
    id: "year-in-review",
    title: "Year in review",
    description: "Log trades across 9 different months.",
    icon: "fa-solid fa-calendar-days",
    category: "exploration",
    target: 9,
    xp: 400,
    minLevel: 3,
    progress: (t) =>
      new Set(
        t.map((x) => month(x.dateClosed ?? x.dateBought)).filter(Boolean),
      ).size,
  },
  {
    id: "two-way",
    title: "Two-way",
    description: "Log at least one call and one put.",
    icon: "fa-solid fa-arrows-left-right",
    category: "exploration",
    target: 2,
    xp: 150,
    progress: (t) =>
      new Set(
        t
          .map((x) => x.option)
          .filter((o): o is "CALL" | "PUT" => o === "CALL" || o === "PUT"),
      ).size,
  },
  {
    id: "iron-journal",
    title: "Iron journal",
    description: "Log 500 trades.",
    icon: "fa-solid fa-dumbbell",
    category: "journaling",
    target: 500,
    xp: 500,
    progress: (t) => t.length,
  },
  {
    id: "chronicle",
    title: "Chronicle",
    description: "Log 1,000 trades.",
    icon: "fa-solid fa-book-journal-whills",
    category: "journaling",
    target: 1000,
    xp: 800,
    minLevel: 5,
    progress: (t) => t.length,
  },
];

export const CHALLENGE_MAP: Record<string, ChallengeDef> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);

// ── Levels ───────────────────────────────────────────────────────────
// Each level costs a little more than the last. Returns the XP needed to go
// from `level` to `level + 1`.
export function xpForLevelUp(level: number): number {
  // Gentle curve so the 36-level ladder is actually reachable from
  // challenges + streak milestones + activity XP (~20k total to level 36).
  return 150 + (level - 1) * 25; // 150, 175, 200, 225, …
}

export const TITLES = [
  "Novice",
  "Apprentice",
  "Journeyman",
  "Practitioner",
  "Disciplined",
  "Strategist",
  "Veteran",
  "Master",
  "Grandmaster",
  "Elite",
  "Legend",
  "Mythic",
];

// Each title now spans this many levels (Novice = 1–3, Apprentice = 4–6, …).
export const LEVELS_PER_TITLE = 3;

// The (base) title for a given level, banded LEVELS_PER_TITLE levels per
// title and clamped to the final title beyond the last band. Used for the
// equippable nameplate, so it stays numeral-free (e.g. "Apprentice").
export function titleForLevel(level: number): string {
  const idx = Math.floor((Math.max(1, level) - 1) / LEVELS_PER_TITLE);
  return TITLES[Math.min(idx, TITLES.length - 1)];
}

const ROMAN = ["I", "II", "III", "IV", "V"];

// The display label for a level within its title band, e.g. levels 4/5/6 →
// "Apprentice I" / "Apprentice II" / "Apprentice III".
export function titleLabel(level: number): string {
  const sub = (Math.max(1, level) - 1) % LEVELS_PER_TITLE;
  const numeral = ROMAN[sub] ?? "";
  return `${titleForLevel(level)} ${numeral}`.trim();
}

export type LevelInfo = {
  level: number; // 1-based
  title: string;
  into: number; // XP earned within the current level
  per: number; // XP needed to fill the current level
  totalXp: number;
};

export function levelInfo(xp: number): LevelInfo {
  const totalXp = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  let into = totalXp;
  while (into >= xpForLevelUp(level)) {
    into -= xpForLevelUp(level);
    level += 1;
  }
  return {
    level,
    title: titleForLevel(level),
    into,
    per: xpForLevelUp(level),
    totalXp,
  };
}
