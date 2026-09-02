// Level rewards - what each level unlocks, aggregated from the cosmetic
// registries plus a per-level Quill AI chat bonus and the level title.
// Pure + client-safe (drives the rewards timeline UI); the actual chat
// granting happens server-side in the challenge-claim route using LEVEL_CHAT.

import {
  TITLES,
  LEVELS_PER_TITLE,
  titleForLevel,
  titleLabel,
} from "@/lib/challenges";
import { AVATAR_COLORS } from "@/lib/avatarColors";
import { AVATAR_FRAMES } from "@/lib/avatarFrames";
import { ACCENTS } from "@/lib/accents";
import { CARD_SKINS } from "@/lib/cardSkins";

// The title mapping lives in challenges.ts (banded per LEVELS_PER_TITLE);
// re-export so the timeline can keep importing from here. titleLabel adds the
// I/II/III numeral within a band.
export { titleForLevel, titleLabel };

// How many levels the rewards ladder shows - enough for every title to span
// its full band of levels.
export const MAX_LEVEL = TITLES.length * LEVELS_PER_TITLE;

// Bonus Quill AI messages granted the first time a level is reached. Not
// every level - 5 free messages every 5 levels (kept modest since every
// message has a real cost).
export const LEVEL_CHAT: Record<number, number> = Object.fromEntries(
  Array.from({ length: MAX_LEVEL }, (_, i) => i + 1)
    .filter((l) => l % 5 === 0)
    .map((l) => [l, 5]),
);

export type LevelReward =
  | { kind: "title"; label: string; icon: string }
  | { kind: "chat"; label: string; amount: number; icon: string }
  | { kind: "color"; label: string; gradient: string }
  | { kind: "frame"; label: string; ring: string }
  | { kind: "accent"; label: string; swatch: string }
  | { kind: "skin"; label: string; swatchFrom: string; swatchTo: string };

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

  // Cosmetics with minLevel 1 are the default set everyone starts with, not
  // unlocks - so level 1 has no cosmetic rewards to list.
  if (level > 1) {
    for (const c of AVATAR_COLORS.filter((x) => x.minLevel === level)) {
      out.push({
        kind: "color",
        label: `${c.label} avatar`,
        gradient: c.gradient,
      });
    }
    for (const f of AVATAR_FRAMES.filter((x) => x.minLevel === level)) {
      out.push({ kind: "frame", label: `${f.label} frame`, ring: f.ring });
    }
    for (const a of ACCENTS.filter((x) => x.minLevel === level)) {
      out.push({
        kind: "accent",
        label: `${a.label} accent`,
        swatch: a.swatch,
      });
    }
    for (const s of CARD_SKINS.filter((x) => x.minLevel === level)) {
      out.push({
        kind: "skin",
        label: `${s.label} card skin`,
        swatchFrom: s.swatchFrom,
        swatchTo: s.swatchTo,
      });
    }
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

  return out;
}
