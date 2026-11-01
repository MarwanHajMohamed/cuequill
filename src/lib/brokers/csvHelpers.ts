// Shared, tolerant CSV parsing helpers for file-mode broker adapters
// (Robinhood, Webull, Firstrade, …). Column names are matched
// case-insensitively against a list of aliases, since every broker names its
// export columns differently. Every adapter's exact headers should be
// validated against a real export before being relied on.

export type Row = Record<string, string>;

// A case-insensitive header → actual-key map for a row.
export function headerMap(row: Row): Map<string, string> {
  const lower = new Map<string, string>();
  for (const k of Object.keys(row)) lower.set(k.trim().toLowerCase(), k);
  return lower;
}

// First non-empty value among the aliased column names.
export function field(row: Row, lower: Map<string, string>, names: string[]): string {
  for (const n of names) {
    const key = lower.get(n.toLowerCase());
    if (key !== undefined && row[key] != null && row[key] !== "") {
      return String(row[key]);
    }
  }
  return "";
}

// Parse a money/number cell: strips $, @ (Webull price prefix) and commas,
// treats (x) as -x.
export function num(s: string): number {
  const cleaned = (s ?? "").replace(/[$@,]/g, "").trim();
  const paren = /^\((.*)\)$/.exec(cleaned);
  const n = parseFloat(paren ? `-${paren[1]}` : cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseOption(s: string): "CALL" | "PUT" | null {
  const v = (s ?? "").trim().toUpperCase();
  if (v.startsWith("CALL") || v === "C") return "CALL";
  if (v.startsWith("PUT") || v === "P") return "PUT";
  return null;
}

export function parseDateSafe(s: string): Date | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type OccOption = {
  symbol: string;
  expiry: Date;
  option: "CALL" | "PUT";
  strike: number;
};

// Parse an OCC-style option symbol into its parts. Handles the common
// encodings brokers use in a single "symbol" cell:
//   "AAPL  240119C00150000"  (space-padded root)
//   "AAPL240119C00150000"    (no padding)
//   "AAPL 240119 150 Call"   (space-separated, human-ish)
// Format is ROOT + YYMMDD + C/P + strike×1000 (8 digits). Returns null when
// the string isn't a recognisable option symbol.
export function parseOccSymbol(raw: string): OccOption | null {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").toUpperCase().trim();
  const m = /^([A-Z]{1,6})(\d{6})([CP])(\d{8})$/.exec(compact);
  if (m) {
    const [, root, ymd, cp, strikeRaw] = m;
    const expiry = occDate(ymd);
    if (!expiry) return null;
    return {
      symbol: root,
      expiry,
      option: cp === "C" ? "CALL" : "PUT",
      strike: parseInt(strikeRaw, 10) / 1000,
    };
  }

  // Human-ish "ROOT YYMMDD|YYYY-MM-DD STRIKE Call/Put" fallback.
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 4) {
    const root = parts[0].toUpperCase();
    const opt = parseOption(parts[parts.length - 1]);
    const strike = num(parts[parts.length - 2]);
    const expiry =
      parseDateSafe(parts[1]) ?? (/^\d{6}$/.test(parts[1]) ? occDate(parts[1]) : null);
    if (root && opt && strike > 0 && expiry) {
      return { symbol: root, expiry, option: opt, strike };
    }
  }
  return null;
}

function occDate(ymd: string): Date | null {
  const yy = parseInt(ymd.slice(0, 2), 10);
  const mm = parseInt(ymd.slice(2, 4), 10);
  const dd = parseInt(ymd.slice(4, 6), 10);
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) {
    return null;
  }
  const d = new Date(Date.UTC(2000 + yy, mm - 1, dd));
  return Number.isNaN(d.getTime()) ? null : d;
}
