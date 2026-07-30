// Level rewards — what each level unlocks, aggregated from the cosmetic
// registries plus a per-level Quill AI chat bonus and the level title.
// Pure + client-safe (drives the rewards timeline UI); the actual chat
// granting happens server-side in the challenge-claim route using LEVEL_CHAT.

import { TITLES } from "@/lib/challenges";
import { AVATAR_COLORS } from "@/lib/avatarColors";
import { AVATAR_FRAMES } from "@/lib/avatarFrames";
import { ACCENTS } from "@/lib/accents";
import { CARD_SKINS } from "@/lib/cardSkins";

// Bonus Quill AI messages granted the first time each level is reached.
// Kept modest on purpose — every message has a real cost — and spread so
// the climb always hands you something.
export const LEVEL_CHAT: Record<number, number> = {
  2: 3,
  3: 5,
  4: 5,
  5: 8,
  6: 8,
  7: 10,
  8: 10,
  9: 12,
  10: 15,
  11: 12,
  12: 20,
};

// How many levels the rewards ladder shows.
export const MAX_LEVEL = 12;

export type LevelReward =
  | { kind: "title"; label: string; icon: string }
  | { kind: "chat"; label: string; amount: number; icon: string }
  | { kind: "color"; label: string; gradient: string }
  | { kind: "frame"; label: string; ring: string }
  | { kind: "accent"; label: string; swatch: string }
  | { kind: "skin"; label: string; swatchFrom: string; swatchTo: string };

// The title shown at a given level (clamped to the last defined title).
export function titleForLevel(level: number): string {
  return TITLES[Math.min(Math.max(level, 1) - 1, TITLES.length - 1)];
}

// Total bonus chats granted for crossing levels in (from, to].
export function chatBetween(from: number, to: number): number {
  let sum = 0;
  for (let l = from + 1; l <= to; l++) sum += LEVEL_CHAT[l] ?? 0;
  return sum;
}

// Every reward unlocked exactly at `level`, richest first (cosmetics →
// chats → title) so the first entry works as the headline.
export function rewardsForLevel(level: number): LevelReward[] {
  const out: LevelReward[] = [];

  for (const c of AVATAR_COLORS.filter((x) => x.minLevel === level)) {
    out.push({ kind: "color", label: `${c.label} avatar`, gradient: c.gradient });
  }
  for (const f of AVATAR_FRAMES.filter((x) => x.minLevel === level)) {
    out.push({ kind: "frame", label: `${f.label} frame`, ring: f.ring });
  }
  for (const a of ACCENTS.filter((x) => x.minLevel === level)) {
    out.push({ kind: "accent", label: `${a.label} accent`, swatch: a.swatch });
  }
  for (const s of CARD_SKINS.filter((x) => x.minLevel === level)) {
    out.push({
      kind: "skin",
      label: `${s.label} card skin`,
      swatchFrom: s.swatchFrom,
      swatchTo: s.swatchTo,
    });
  }

  const chat = LEVEL_CHAT[level];
  if (chat) {
    out.push({
      kind: "chat",
      label: `${chat} Quill messages`,
      amount: chat,
      icon: "fa-solid fa-comment-dots",
    });
  }

  // A new title, when this level introduces one distinct from the level
  // below it (level 1's title is the starting title, not an unlock).
  const title = titleForLevel(level);
  if (level > 1 && title !== titleForLevel(level - 1)) {
    out.push({ kind: "title", label: `“${title}” title`, icon: "fa-solid fa-id-badge" });
  }

  return out;
}
