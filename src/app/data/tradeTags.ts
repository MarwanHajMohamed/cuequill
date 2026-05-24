// Emotion / behavior tags users can attach to a trade.
// `kind` lets the UI color-code mistakes vs deliberate-good behavior.

export type TradeTagKind = "mistake" | "good";
export type TradeTagOption = { label: string; kind: TradeTagKind };

export const TRADE_TAG_OPTIONS: TradeTagOption[] = [
  { label: "FOMO", kind: "mistake" },
  { label: "Revenge", kind: "mistake" },
  { label: "Broke rule", kind: "mistake" },
  { label: "Hesitated", kind: "mistake" },
  { label: "Oversized", kind: "mistake" },
  { label: "Held too long", kind: "mistake" },
  { label: "Cut too early", kind: "mistake" },
  { label: "Followed plan", kind: "good" },
  { label: "A+ setup", kind: "good" },
];

export const TAG_KIND_BY_LABEL: Record<string, TradeTagKind> =
  Object.fromEntries(TRADE_TAG_OPTIONS.map((t) => [t.label, t.kind]));
