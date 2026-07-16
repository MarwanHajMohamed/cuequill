// Real option marks (bid/ask/last → a mid mark) for the user's option
// positions, so we can compute genuine unrealized P/L rather than just the
// underlying's move.
//
// Providers live behind a small abstraction (OptionsProvider) and are
// selected by env, so the routes, hook, dashboard, and Quill tool never
// change when the source does. When nothing is configured,
// isOptionsConfigured() is false and callers fall back to the underlying
// quote.
//
// Setup (env) — configure ONE:
//   Polygon.io (UK/global signup, no US brokerage account, unlimited calls
//   on the paid Options plan — the recommended source):
//     POLYGON_API_KEY   - your Polygon key
//     POLYGON_API_BASE  - optional, defaults to https://api.polygon.io
//
//   Tradier (US brokerage account required):
//     TRADIER_TOKEN     - a Tradier access token
//     TRADIER_API_BASE  - defaults to the sandbox host; set
//                         https://api.tradier.com for production
//
//   OPTIONS_PROVIDER    - optional "polygon" | "tradier" to force one when
//                         more than one is configured; otherwise Polygon
//                         wins if its key is present.

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

const POLYGON_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE = (
  process.env.POLYGON_API_BASE ?? "https://api.polygon.io"
).replace(/\/+$/, "");
const TRADIER_TOKEN =
  process.env.TRADIER_TOKEN ?? process.env.TRADIER_ACCESS_TOKEN;
const TRADIER_BASE = (
  process.env.TRADIER_API_BASE ?? "https://sandbox.tradier.com"
).replace(/\/+$/, "");

// Which provider to use. Explicit override, else Polygon if keyed, else
// Tradier if keyed, else none.
function selectedProviderName(): "polygon" | "tradier" | null {
  const forced = process.env.OPTIONS_PROVIDER?.toLowerCase();
  if (forced === "polygon") return POLYGON_KEY ? "polygon" : null;
  if (forced === "tradier") return TRADIER_TOKEN ? "tradier" : null;
  if (POLYGON_KEY) return "polygon";
  if (TRADIER_TOKEN) return "tradier";
  return null;
}

export function isOptionsConfigured(): boolean {
  return selectedProviderName() !== null;
}

// OCC option symbol, e.g. { SPY, 2024-03-15, 600, CALL } → SPY240315C00600000.
// This compact (unpadded-root) form is what Tradier quotes on directly;
// the Polygon provider prefixes it with "O:".
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

function markOf(
  bidRaw: unknown,
  askRaw: unknown,
  lastRaw: unknown,
): Pick<OptionMark, "bid" | "ask" | "last" | "mark"> {
  const bid = num(bidRaw);
  const ask = num(askRaw);
  const last = num(lastRaw);
  const mark = bid != null && ask != null ? (bid + ask) / 2 : last;
  return { bid, ask, last, mark };
}

function toMark(q: TradierQuote): OptionMark {
  let asOf: string | null = null;
  if (q.trade_date) {
    const d = new Date(Number(q.trade_date));
    asOf = Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return {
    occSymbol: q.symbol.toUpperCase(),
    ...markOf(q.bid, q.ask, q.last),
    asOf,
  };
}

interface OptionsProvider {
  getMarks(occSymbols: string[]): Promise<Map<string, OptionMark>>;
}

// Tradier: batch-quote OCC symbols via /v1/markets/quotes.
const tradierProvider: OptionsProvider = {
  async getMarks(occSymbols) {
    const out = new Map<string, OptionMark>();
    if (!TRADIER_TOKEN || occSymbols.length === 0) return out;
    const url = `${TRADIER_BASE}/v1/markets/quotes?symbols=${encodeURIComponent(
      occSymbols.join(","),
    )}&greeks=false`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TRADIER_TOKEN}`,
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

type PolygonSnapshot = {
  results?: {
    last_quote?: { bid?: number; ask?: number; midpoint?: number; last_updated?: number };
    last_trade?: { price?: number; sip_timestamp?: number };
  };
};

// Underlying ticker embedded in an OCC symbol: everything before the
// trailing yymmdd(6) + C/P(1) + strike(8) = 15 chars.
function underlyingOf(occ: string): string {
  return occ.slice(0, Math.max(0, occ.length - 15));
}

// Polygon: one option-contract snapshot per symbol
// (/v3/snapshot/options/{underlying}/O:{occ}). Snapshots aren't batchable,
// so we fan out with a small concurrency limit; the shared cache keeps the
// count low across renders.
const polygonProvider: OptionsProvider = {
  async getMarks(occSymbols) {
    const out = new Map<string, OptionMark>();
    if (!POLYGON_KEY || occSymbols.length === 0) return out;

    const fetchOne = async (occ: string): Promise<void> => {
      const underlying = underlyingOf(occ);
      if (!underlying) return;
      const url = `${POLYGON_BASE}/v3/snapshot/options/${encodeURIComponent(
        underlying,
      )}/${encodeURIComponent(`O:${occ}`)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${POLYGON_KEY}` },
      });
      // 404 = contract not found (e.g. wrong strike/expiry); skip it rather
      // than failing the whole batch.
      if (res.status === 404) return;
      if (!res.ok) throw new Error(`Polygon returned ${res.status}`);
      const json = (await res.json()) as PolygonSnapshot;
      const r = json.results;
      if (!r) return;
      const q = r.last_quote;
      const { bid, ask, last, mark } = markOf(
        q?.bid,
        q?.ask,
        r.last_trade?.price,
      );
      // Prefer Polygon's own midpoint when present.
      const finalMark =
        q?.midpoint != null && Number.isFinite(q.midpoint) && q.midpoint > 0
          ? q.midpoint
          : mark;
      let asOf: string | null = null;
      const tsNs = q?.last_updated ?? r.last_trade?.sip_timestamp;
      if (tsNs) {
        const d = new Date(Number(tsNs) / 1e6); // ns → ms
        asOf = Number.isNaN(d.getTime()) ? null : d.toISOString();
      }
      out.set(occ, { occSymbol: occ, bid, ask, last, mark: finalMark, asOf });
    };

    // Bounded concurrency so a large batch doesn't open dozens of sockets
    // or trip a rate limit all at once.
    const LIMIT = 6;
    for (let i = 0; i < occSymbols.length; i += LIMIT) {
      await Promise.all(occSymbols.slice(i, i + LIMIT).map(fetchOne));
    }
    return out;
  },
};

function activeProvider(): OptionsProvider | null {
  switch (selectedProviderName()) {
    case "polygon":
      return polygonProvider;
    case "tradier":
      return tradierProvider;
    default:
      return null;
  }
}

// Fetch marks for a set of option positions. Returns a map keyed by the
// OCC symbol. Positions we can't build a symbol for, or that the provider
// can't price, are simply absent. Uses a short cache so repeated dashboard
// renders don't hammer the provider.
export async function getOptionMarks(
  positions: OptionPosition[],
): Promise<Map<string, OptionMark>> {
  const out = new Map<string, OptionMark>();
  const provider = activeProvider();
  if (!provider) return out;

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
