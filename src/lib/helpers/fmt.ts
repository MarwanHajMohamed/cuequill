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
// The unsigned variant prefixes the currency symbol only. The signed
// variant prefixes "+" or "-" so positive vs negative reads at a glance —
// this is what the calendar tiles, day modal, and stats tiles use.

// Display currency symbol (symbol-only — no FX conversion). Defaults to
// "$"; the user's account preference sets it app-wide via
// setDisplayCurrency (see CurrencySync). We cache it in localStorage and
// read it synchronously on the client so the first paint is already right.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  NZD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  CHF: "Fr ",
  HKD: "$",
  SGD: "$",
};

let currencySymbol = "$";

export function symbolForCurrency(code?: string | null): string {
  if (!code) return "$";
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? code.toUpperCase() + " ";
}

export function setDisplayCurrency(code?: string | null): void {
  currencySymbol = symbolForCurrency(code);
  if (typeof window !== "undefined") {
    try {
      if (code) localStorage.setItem("cuequill:currency", code);
    } catch {
      /* ignore */
    }
  }
}

if (typeof window !== "undefined") {
  try {
    const cached = localStorage.getItem("cuequill:currency");
    if (cached) currencySymbol = symbolForCurrency(cached);
  } catch {
    /* ignore */
  }
}

export function fmtMoneyCompact(value: number): string {
  if (!Number.isFinite(value)) return currencySymbol + "0.00";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return sign + currencySymbol + compact(abs);
}

export function fmtMoneySignedCompact(value: number): string {
  if (!Number.isFinite(value)) return "+" + currencySymbol + "0.00";
  const sign = value >= 0 ? "+" : "-";
  return sign + currencySymbol + compact(Math.abs(value));
}

// Full, un-abbreviated money — thousands separators and two decimals
// (e.g. "$12,345.67"). Used where the exact figure matters more than
// saving space, like the calendar's monthly P/L headline.
export function fmtMoneyFull(value: number): string {
  if (!Number.isFinite(value)) return currencySymbol + "0.00";
  const sign = value < 0 ? "-" : "";
  return (
    sign +
    currencySymbol +
    Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
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
