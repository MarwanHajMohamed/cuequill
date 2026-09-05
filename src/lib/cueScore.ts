import type { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

// ── Cue points ────────────────────────────────────────────────────────
// A single 0–100 score summarising the *quality* of a trader's closed
// history - not just how much they made. Six components, each normalised to
// 0–100 with a documented threshold, then combined with a fixed weighted
// average. The formula is intentionally transparent (no black box): the
// thresholds and weights live right here so the number is explainable.

const clamp = (x: number) => Math.max(0, Math.min(100, x));
const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";

export type CueComponent = {
  key: string;
  label: string;
  // Human-readable raw metric (e.g. "58%", "1.9", "∞").
  display: string;
  // 0–100 sub-score that feeds the overall number.
  score: number;
  // Weight of this component in the overall score (0–1).
  weight: number;
};

export type CueScore = {
  score: number; // 0–100 overall
  trades: number; // closed trades the score is based on
  components: CueComponent[];
};

// Component weights - sum to 1. Profit factor and consistency carry the most
// weight because they best capture a durable, repeatable edge.
const WEIGHTS = {
  winRate: 0.15,
  profitFactor: 0.2,
  winLoss: 0.15,
  drawdown: 0.15,
  recovery: 0.15,
  consistency: 0.2,
} as const;

export function computeCueScore(trades: Trade[] | undefined): CueScore | null {
  if (!trades) return null;
  const closed = trades.filter(isClosed);
  if (closed.length === 0) return null;

  const wins = closed.filter((t) => t.status === "WIN");
  const losses = closed.filter((t) => t.status === "LOSS");

  const grossProfit = wins.reduce((s, t) => s + tradeNetPL(t), 0);
  // Losses carry negative net P/L; flip to a positive magnitude.
  const grossLoss = -losses.reduce((s, t) => s + tradeNetPL(t), 0);
  const netProfit = grossProfit - grossLoss;

  const winRate = (wins.length / closed.length) * 100;
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null; // ∞ if no losses
  const winLoss = avgLoss > 0 ? avgWin / avgLoss : null; // ∞ if no losses

  // Equity curve over closing order → peak equity and max drawdown.
  const ordered = [...closed].sort((a, b) => {
    const da = new Date(a.dateClosed ?? a.dateBought ?? 0).getTime();
    const db = new Date(b.dateClosed ?? b.dateBought ?? 0).getTime();
    return da - db;
  });
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of ordered) {
    equity += tradeNetPL(t);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  // Drawdown as a fraction of the highest equity reached. If the account
  // never got into profit, treat drawdown as total (worst case).
  const drawdownPct = peak > 0 ? maxDrawdown / peak : 1;
  const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : null; // ∞ if no drawdown

  // Consistency: how much the single biggest winner dominates gross profit.
  // A share of 0.2 (no trade is more than ~20% of profits) reads as fully
  // consistent; one trade carrying everything reads as fragile.
  const largestWin = wins.reduce((m, t) => Math.max(m, tradeNetPL(t)), 0);
  const largestWinShare = grossProfit > 0 ? largestWin / grossProfit : 1;

  // ── Sub-scores (0–100) with documented thresholds ──
  const sWinRate = clamp((winRate / 60) * 100); // 60%+ win rate = full marks
  const sProfitFactor =
    profitFactor === null
      ? wins.length > 0
        ? 100
        : 0
      : clamp((profitFactor / 2) * 100); // PF 2.0 = full marks
  const sWinLoss =
    winLoss === null
      ? avgWin > 0
        ? 100
        : 0
      : clamp((winLoss / 2) * 100); // 2:1 avg win/loss = full marks
  const sDrawdown = clamp((1 - drawdownPct) * 100); // smaller drawdown = higher
  const sRecovery =
    recoveryFactor === null
      ? netProfit > 0
        ? 100
        : 0
      : clamp((recoveryFactor / 3) * 100); // RF 3.0 = full marks
  const sConsistency = clamp((1 - largestWinShare) * 125); // ≤20% share = full marks

  const components: CueComponent[] = [
    {
      key: "winRate",
      label: "Win rate",
      display: `${winRate.toFixed(0)}%`,
      score: sWinRate,
      weight: WEIGHTS.winRate,
    },
    {
      key: "profitFactor",
      label: "Profit factor",
      display: profitFactor === null ? "∞" : profitFactor.toFixed(2),
      score: sProfitFactor,
      weight: WEIGHTS.profitFactor,
    },
    {
      key: "winLoss",
      label: "Win / loss",
      display: winLoss === null ? "∞" : winLoss.toFixed(2),
      score: sWinLoss,
      weight: WEIGHTS.winLoss,
    },
    {
      key: "drawdown",
      label: "Max drawdown",
      display: `${(drawdownPct * 100).toFixed(0)}%`,
      score: sDrawdown,
      weight: WEIGHTS.drawdown,
    },
    {
      key: "recovery",
      label: "Recovery factor",
      display: recoveryFactor === null ? "∞" : recoveryFactor.toFixed(2),
      score: sRecovery,
      weight: WEIGHTS.recovery,
    },
    {
      key: "consistency",
      label: "Consistency",
      display: `${sConsistency.toFixed(0)}`,
      score: sConsistency,
      weight: WEIGHTS.consistency,
    },
  ];

  const score = Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0),
  );

  return { score, trades: closed.length, components };
}

// Colour band for an overall score, as a small token set the widget maps to
// classes. Kept here so the score→band rule is defined once.
export function cueBand(score: number): "great" | "good" | "ok" | "low" {
  if (score >= 80) return "great";
  if (score >= 60) return "good";
  if (score >= 40) return "ok";
  return "low";
}
