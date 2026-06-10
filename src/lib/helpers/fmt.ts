// Compact money formatters used across the journal so big dollar
// amounts don't overflow tiles, day cells, or summary numbers.
//
// Rules:
//   < $1,000        → "$842.17"      (two decimals)
//   < $10,000       → "$1.23k"       (two decimals)
//   < $100,000      → "$12.4k"       (one decimal)
//   < $1,000,000    → "$123k"        (no decimals)
//   < $10,000,000   → "$1.23M"
//   ...etc
//
// The unsigned variant prefixes "$" only. The signed variant prefixes
// "+" or "-" so positive vs negative reads at a glance — this is what
// the calendar tiles, day modal, and stats tiles use.

export function fmtMoneyCompact(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return sign + "$" + compact(abs);
}

export function fmtMoneySignedCompact(value: number): string {
  if (!Number.isFinite(value)) return "+$0.00";
  const sign = value >= 0 ? "+" : "-";
  return sign + "$" + compact(Math.abs(value));
}

function compact(abs: number): string {
  if (abs < 1_000) return abs.toFixed(2);
  if (abs < 10_000) return (abs / 1_000).toFixed(2) + "k";
  if (abs < 100_000) return (abs / 1_000).toFixed(1) + "k";
  if (abs < 1_000_000) return Math.round(abs / 1_000) + "k";
  if (abs < 10_000_000) return (abs / 1_000_000).toFixed(2) + "M";
  if (abs < 100_000_000) return (abs / 1_000_000).toFixed(1) + "M";
  if (abs < 1_000_000_000) return Math.round(abs / 1_000_000) + "M";
  return (abs / 1_000_000_000).toFixed(2) + "B";
}
