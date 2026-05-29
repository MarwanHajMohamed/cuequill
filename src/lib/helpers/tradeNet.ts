// Net P/L for a trade: gross realized P/L minus commissions/fees.
// Always subtract fees if present; default 0 so legacy trades behave
// identically to before fees existed.
export function tradeNetPL(t: {
  profitLoss?: number | null;
  fees?: number | null;
}): number {
  return (t.profitLoss ?? 0) - (t.fees ?? 0);
}
