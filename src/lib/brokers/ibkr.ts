import Papa from "papaparse";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import type { NormalizedFill } from "@/lib/ibkr/match";
import type { BrokerAdapter } from "./types";

// Interactive Brokers adapter. Pulls a CSV from IBKR's Flex Statement
// web service and maps its rows into broker-agnostic fills. This is the
// only IBKR-specific code in the import pipeline.
//
// Two Flex query shapes are supported with one tolerant parser:
//   • Activity Flex (the "Trades" section) - settles on T+1, carries
//     realized P/L. Signed Quantity, TradePrice, IBCommission, Taxes.
//   • Trade Confirmation Flex - reports SAME-DAY executions, so trades can
//     be imported the day they're taken. Tends to use Price, a Buy/Sell
//     column (unsigned Quantity), Commission and Tax.
// Column names differ between the two, so each field reads whichever of
// its known aliases is present.

type CsvRow = {
  Symbol: string;
  UnderlyingSymbol?: string;
  Strike: string;
  Expiry: string;
  "Put/Call": "C" | "P";
  Quantity: string;
  // Direction on Trade Confirmation statements, where Quantity is unsigned.
  "Buy/Sell"?: string;
  // Activity uses TradePrice; Trade Confirmation uses Price.
  TradePrice?: string;
  Price?: string;
  // Activity uses DateTime; Trade Confirmation may use "Date/Time".
  DateTime?: string;
  "Date/Time"?: string;
  FifoPnlRealized?: string;
  TradeID?: string;
  // Commission/fees columns. Whichever the user includes in their Flex
  // query will be parsed; missing columns are treated as 0. IBKR
  // reports these as negative values (debits), so we always take the
  // absolute amount. Activity: IBCommission + Taxes. Trade Confirmation:
  // Commission + Tax.
  IBCommission?: string;
  Commission?: string;
  Taxes?: string;
  Tax?: string;
};

// Parses IBKR commission/fee strings. Returns absolute value (IBKR
// reports debits as negatives; we store fees as positive). Empty or
// missing values yield 0.
function absFee(s: string | undefined | null): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function makeETDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  for (const offsetHours of [4, 5]) {
    const candidate = new Date(
      Date.UTC(year, month - 1, day, hour + offsetHours, minute, second),
    );
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(candidate);
    const etHourRaw = parseInt(parts.find((p) => p.type === "hour")!.value);
    const etHour = etHourRaw === 24 ? 0 : etHourRaw;
    if (etHour === hour) return candidate;
  }
  return new Date(Date.UTC(year, month - 1, day, hour + 4, minute, second));
}

function parseDateTime(dateStr: string) {
  const [date, time] = dateStr.split(";");
  const year = parseInt(date.substring(0, 4));
  const month = parseInt(date.substring(4, 6));
  const day = parseInt(date.substring(6, 8));
  const hour = parseInt(time.substring(0, 2));
  const minute = parseInt(time.substring(2, 4));
  const second = parseInt(time.substring(4, 6));
  return makeETDate(year, month, day, hour, minute, second);
}

function parseExpiry(expiryStr: string) {
  const date = expiryStr.split(".")[0];
  const year = parseInt(date.substring(0, 4));
  const month = parseInt(date.substring(4, 6)) - 1;
  const day = parseInt(date.substring(6, 8));
  return new Date(year, month, day);
}

function extractXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1].trim() : "";
}

const IBKR_HEADERS = {
  "User-Agent": "Java/1.8.0_192",
};

async function fetchIbkrCsv(token: string, queryId: string): Promise<string> {
  const sendUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${token}&q=${queryId}&v=3`;

  // IBKR Flex SendRequest can answer with several distinct non-Success
  // codes. We treat them differently:
  //   1001 / 1004        - statement still being generated ("try again
  //                        shortly"). This is a TRANSIENT, IBKR-side state -
  //                        the Flex service just couldn't build the statement
  //                        at that instant. It is NOT a usage/quota limit, so
  //                        retry a few times with a short delay to ride it out.
  //   1018 / 1019 / 1020 - explicitly throttled (too many requests). THIS is
  //                        the real "pulled too often" case. Retrying within
  //                        seconds only makes it worse, so surface immediately.
  //   1003 / 1011        - invalid/expired token (not retryable)
  //   1006               - invalid queryId        (not retryable)
  const GENERATING_CODES = new Set(["1001", "1004"]);
  const THROTTLE_CODES = new Set(["1018", "1019", "1020"]);
  // A 1001 means "try again shortly", which can take longer than a few
  // seconds to clear. Retry a handful of times with a modest gap - enough to
  // outlast a transient hiccup, but gentle enough not to trip the real
  // throttle (1018/1019/1020, handled separately below).
  const SEND_ATTEMPTS = 3;
  const SEND_DELAY_MS = 15000;

  // Build an error that carries IBKR's own code + message so the user (and
  // logs) can see exactly what Flex said, not a guess.
  const rateLimited = (code: string, msg: string, kind: "throttle" | "busy") => {
    const detail = `IBKR code ${code}${msg ? `: ${msg}` : ""}`;
    const err = new Error(
      kind === "throttle"
        ? `IBKR is rate-limiting Flex requests (${detail}). Flex only lets a query run every few minutes - wait ~10 minutes, then try again.`
        : `IBKR couldn't generate the statement yet (${detail}). This is a temporary issue on IBKR's side, not a usage limit - wait a few minutes and try again. If it keeps happening for a while, double-check the Query ID and that the token is still valid.`,
    );
    (err as Error & { code?: string }).code = "RATE_LIMITED";
    return err;
  };

  let sendXml = "";
  let status = "";
  let lastCode = "";
  let lastMsg = "";
  for (let attempt = 0; attempt < SEND_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, SEND_DELAY_MS));

    const sendRes = await fetch(sendUrl, { headers: IBKR_HEADERS });
    sendXml = await sendRes.text();
    status = extractXmlValue(sendXml, "Status");
    if (status === "Success") break;

    lastMsg = extractXmlValue(sendXml, "ErrorMessage") || "Unknown error";
    lastCode = extractXmlValue(sendXml, "ErrorCode");

    // Explicit throttle - don't retry (it worsens it); report with the code.
    if (THROTTLE_CODES.has(lastCode)) {
      throw rateLimited(lastCode, lastMsg, "throttle");
    }
    // Config problems (bad/expired token, bad queryId, …) won't clear on a
    // retry - surface IBKR's exact message and code immediately so the user
    // can act (e.g. regenerate the token in the IBKR portal).
    if (!GENERATING_CODES.has(lastCode)) {
      throw new Error(
        `IBKR request failed${lastCode ? ` (code ${lastCode})` : ""}: ${lastMsg}`,
      );
    }
    // 1001 / 1004 - statement warming up; retry after the delay.
  }

  if (status !== "Success") {
    // Never cleared after the retries - IBKR still can't build the statement.
    // Transient on their side; the user just needs to retry shortly.
    throw rateLimited(lastCode || "1001", lastMsg, "busy");
  }

  const referenceCode = extractXmlValue(sendXml, "ReferenceCode");
  const baseUrl = extractXmlValue(sendXml, "Url");

  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 10000));

    const getUrl = `${baseUrl}?t=${token}&q=${referenceCode}&v=3`;
    const getRes = await fetch(getUrl, { headers: IBKR_HEADERS });
    const body = await getRes.text();

    if (body.includes("<Status>Processing</Status>")) continue;

    if (body.includes("<Status>Fail</Status>")) {
      const errorMsg = extractXmlValue(body, "ErrorMessage") || "Unknown error";
      const errorCode = extractXmlValue(body, "ErrorCode");
      throw new Error(
        `IBKR retrieval failed${errorCode ? ` (code ${errorCode})` : ""}: ${errorMsg}`,
      );
    }

    return body;
  }

  throw new Error("IBKR statement timed out after 50 seconds");
}

// Maps one IBKR CSV row (Activity or Trade Confirmation) into a
// normalized fill, reading whichever column alias is present. Returns null
// for rows that aren't equity-option trades (e.g. forex, or a blank line).
// Exported for unit testing against both schemas.
export function mapRowToFill(row: CsvRow): NormalizedFill | null {
  // Non-option rows (forex etc.) carry a "." in the OCC symbol; skip them.
  if (!row.Symbol || row.Symbol.includes(".")) return null;

  const priceStr = row.TradePrice ?? row.Price;
  const dateStr = row.DateTime ?? row["Date/Time"];
  if (priceStr == null || !dateStr) return null;

  // Quantity: Activity signs it; Trade Confirmation leaves it positive and
  // puts the direction in Buy/Sell. Honour an explicit Buy/Sell when given.
  const rawQty = parseInt(row.Quantity);
  if (!Number.isFinite(rawQty) || rawQty === 0) return null;
  const side = (row["Buy/Sell"] ?? "").trim().toUpperCase();
  const signedQty = side.startsWith("S")
    ? -Math.abs(rawQty)
    : side.startsWith("B")
      ? Math.abs(rawQty)
      : rawQty;

  // Prefer the dedicated underlying column; fall back to the OCC symbol's
  // leading token (e.g. "SPY   251017C00600000" → "SPY").
  const underlying = (row.UnderlyingSymbol || row.Symbol).split(" ")[0];

  const realized = parseFloat(row.FifoPnlRealized ?? "");

  return {
    symbol: underlying,
    option: row["Put/Call"] === "C" ? "CALL" : "PUT",
    strike: parseFloat(row.Strike),
    expiry: parseExpiry(row.Expiry),
    signedQty,
    price: parseFloat(priceStr),
    time: parseDateTime(dateStr),
    ...(Number.isFinite(realized) && { realizedPnl: realized }),
    fee:
      absFee(row.IBCommission ?? row.Commission) +
      absFee(row.Taxes ?? row.Tax),
    tradeId: row.TradeID,
  };
}

function parseFillsCsv(csv: string): NormalizedFill[] {
  const { data } = Papa.parse<CsvRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return data
    .map(mapRowToFill)
    .filter((f): f is NormalizedFill => f !== null);
}

// Fetch + parse one Flex query's CSV into fills.
async function fetchFillsForQuery(
  token: string,
  queryId: string,
): Promise<NormalizedFill[]> {
  const csv = await fetchIbkrCsv(token, queryId);
  return parseFillsCsv(csv);
}

// Activity Flex fills (the default pull: settled trades + realized P/L).
async function fetchFills(userId: string): Promise<NormalizedFill[]> {
  await connectDb();
  const user = await User.findById(userId).select("ibkrToken ibkrQueryId");

  if (!user?.ibkrToken || !user?.ibkrQueryId) {
    throw new Error("IBKR credentials not configured");
  }

  return fetchFillsForQuery(user.ibkrToken, user.ibkrQueryId);
}

// Trade Confirmation Flex fills (same-day executions). Returns [] when the
// user hasn't configured a confirmation query, so callers can merge freely.
export async function fetchConfirmFills(
  userId: string,
): Promise<NormalizedFill[]> {
  await connectDb();
  const user = await User.findById(userId).select(
    "ibkrToken ibkrTradeConfirmQueryId",
  );

  if (!user?.ibkrToken) {
    throw new Error("IBKR credentials not configured");
  }
  if (!user.ibkrTradeConfirmQueryId) return [];

  return fetchFillsForQuery(user.ibkrToken, user.ibkrTradeConfirmQueryId);
}


export const ibkrAdapter: BrokerAdapter = {
  id: "ibkr",
  label: "Interactive Brokers",
  mode: "pull",
  fetchFills,
};
