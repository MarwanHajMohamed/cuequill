// Real option marks (bid/ask/last → a mid mark) for the user's option
// positions, so we can compute genuine unrealized P/L rather than just the
// underlying's move. Sourced from Tradier's market-data API.
//
// Setup (env):
//   TRADIER_TOKEN     - a Tradier access token (required to enable this)
//   TRADIER_API_BASE  - defaults to the sandbox host (delayed data, free).
//                       Set to https://api.tradier.com with a production
//                       token + market-data agreement for real-time.
//
// The provider is behind a small abstraction (OptionsProvider) so a
// different source (Polygon, IBKR, …) can be swapped in without touching
// the routes or UI. When no token is configured, isOptionsConfigured()
// returns false and callers fall back to the underlying quote.

export type OptionType = "CALL" | "PUT";

export type OptionPosition = {
  symbol: string; // underlying, e.g. SPY
  expiry: string; // yyyy-mm-dd
  strike: number;
  type: OptionType;
};

export type OptionMark = {
  occSymbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  mark: number | null; // mid of bid/ask, else last
  asOf: string | null; // ISO
};

const TOKEN = process.env.TRADIER_TOKEN ?? process.env.TRADIER_ACCESS_TOKEN;
const BASE = (
  process.env.TRADIER_API_BASE ?? "https://sandbox.tradier.com"
).replace(/\/+$/, "");

export function isOptionsConfigured(): boolean {
  return !!TOKEN;
}

// OCC option symbol, e.g. { SPY, 2024-03-15, 600, CALL } → SPY240315C00600000.
// Tradier accepts this compact (unpadded-root) form for quotes.
export function occSymbol(p: OptionPosition): string | null {
  const root = p.symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.expiry.trim());
  if (!root || !m) return null;
  if (!Number.isFinite(p.strike) || p.strike <= 0) return null;
  const yymmdd = `${m[1].slice(2)}${m[2]}${m[3]}`;
  const t = p.type === "PUT" ? "P" : "C";
  // Strike is thousandths of a dollar, zero-padded to 8 digits.
  const strike8 = String(Math.round(p.strike * 1000)).padStart(8, "0");
  return `${root}${yymmdd}${t}${strike8}`;
}

// ── Cache ──────────────────────────────────────────────────────────────
const TTL_MS = 15 * 1000;
const cache = new Map<string, { at: number; mark: OptionMark }>();

type TradierQuote = {
  symbol: string;
  last?: number | null;
  bid?: number | null;
  ask?: number | null;
  trade_date?: number | null; // epoch ms
  bidexch?: string;
};

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toMark(q: TradierQuote): OptionMark {
  const bid = num(q.bid);
  const ask = num(q.ask);
  const last = num(q.last);
  const mark = bid != null && ask != null ? (bid + ask) / 2 : last;
  let asOf: string | null = null;
  if (q.trade_date) {
    const d = new Date(Number(q.trade_date));
    asOf = Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return { occSymbol: q.symbol.toUpperCase(), bid, ask, last, mark, asOf };
}

interface OptionsProvider {
  getMarks(occSymbols: string[]): Promise<Map<string, OptionMark>>;
}

// Tradier: batch-quote OCC symbols via /v1/markets/quotes.
const tradierProvider: OptionsProvider = {
  async getMarks(occSymbols) {
    const out = new Map<string, OptionMark>();
    if (!TOKEN || occSymbols.length === 0) return out;
    const url = `${BASE}/v1/markets/quotes?symbols=${encodeURIComponent(
      occSymbols.join(","),
    )}&greeks=false`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Tradier returned ${res.status}`);
    }
    const json = await res.json();
    const q = json?.quotes?.quote;
    const arr: TradierQuote[] = Array.isArray(q) ? q : q ? [q] : [];
    for (const raw of arr) {
      if (!raw?.symbol) continue;
      out.set(raw.symbol.toUpperCase(), toMark(raw));
    }
    return out;
  },
};

const provider: OptionsProvider = tradierProvider;

// Fetch marks for a set of option positions. Returns a map keyed by the
// OCC symbol. Positions we can't build a symbol for, or that the provider
// can't price, are simply absent. Uses a short cache so repeated dashboard
// renders don't hammer the provider.
export async function getOptionMarks(
  positions: OptionPosition[],
): Promise<Map<string, OptionMark>> {
  const out = new Map<string, OptionMark>();
  if (!isOptionsConfigured()) return out;

  const now = Date.now();
  const misses: string[] = [];
  for (const p of positions) {
    const occ = occSymbol(p);
    if (!occ) continue;
    const hit = cache.get(occ);
    if (hit && now - hit.at < TTL_MS) out.set(occ, hit.mark);
    else if (!misses.includes(occ)) misses.push(occ);
  }
  if (misses.length === 0) return out;

  const fetched = await provider.getMarks(misses);
  for (const [occ, mark] of fetched) {
    cache.set(occ, { at: now, mark });
    out.set(occ, mark);
  }
  return out;
}
