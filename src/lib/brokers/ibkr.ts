import Papa from "papaparse";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import type { NormalizedFill } from "@/lib/ibkr/match";
import type { BrokerAdapter } from "./types";

// Interactive Brokers adapter. Pulls a CSV from IBKR's Flex Statement
// web service and maps its rows into broker-agnostic fills. This is the
// only IBKR-specific code in the import pipeline.

type CsvRow = {
  Symbol: string;
  Strike: string;
  Expiry: string;
  "Put/Call": "C" | "P";
  Quantity: string;
  TradePrice: string;
  DateTime: string;
  FifoPnlRealized: string;
  TradeID?: string;
  // Commission/fees columns. Whichever the user includes in their Flex
  // query will be parsed; missing columns are treated as 0. IBKR
  // reports these as negative values (debits), so we always take the
  // absolute amount.
  IBCommission?: string;
  Commission?: string;
  Taxes?: string;
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

export async function fetchIbkrCsv(
  token: string,
  queryId: string,
): Promise<string> {
  const sendUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${token}&q=${queryId}&v=3`;
  const sendRes = await fetch(sendUrl, { headers: IBKR_HEADERS });
  const sendXml = await sendRes.text();

  const status = extractXmlValue(sendXml, "Status");
  if (status !== "Success") {
    const errorMsg =
      extractXmlValue(sendXml, "ErrorMessage") || "Unknown error";
    const errorCode = extractXmlValue(sendXml, "ErrorCode");

    // IBKR uses similar "please try again shortly" wording for several
    // distinct failures: a real rate limit, a half-generated statement
    // still on their side, a bad token, a bad queryId, etc. Only the
    // explicit wait-and-retry codes mean "this clears on its own" -
    // everything else is a config problem the user needs to fix. Codes
    // per IBKR Flex docs:
    //   1001               - statement can't be generated right now
    //                        (IBKR busy OR the query was requested too
    //                        recently — Flex throttles frequent syncs)
    //   1004               - statement still incomplete on IBKR's side
    //   1018 / 1019 / 1020 - statement throttled, retry after delay
    //   1003 / 1011        - invalid or expired token
    //   1006               - invalid queryId
    const RETRY_CODES = new Set(["1001", "1004", "1018", "1019", "1020"]);
    if (RETRY_CODES.has(errorCode)) {
      const stillGenerating = errorCode === "1001" || errorCode === "1004";
      const err = new Error(
        stillGenerating
          ? "IBKR couldn't generate the statement right now — it's busy or the query was requested too recently. Sync less frequently (Flex allows roughly one request per query every ~15+ min); it'll retry next run."
          : "IBKR is rate-limiting this query. Please sync less often.",
      );
      (err as Error & { code?: string }).code = "RATE_LIMITED";
      throw err;
    }

    // Surface IBKR's exact message and code so the user can actually act
    // on it (e.g. regenerate token in the IBKR portal when it's expired).
    throw new Error(
      `IBKR request failed${errorCode ? ` (code ${errorCode})` : ""}: ${errorMsg}`,
    );
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

async function fetchFills(userId: string): Promise<NormalizedFill[]> {
  await connectDb();
  const user = await User.findById(userId).select("ibkrToken ibkrQueryId");

  if (!user?.ibkrToken || !user?.ibkrQueryId) {
    throw new Error("IBKR credentials not configured");
  }

  const csv = await fetchIbkrCsv(user.ibkrToken, user.ibkrQueryId);

  const { data } = Papa.parse<CsvRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const filteredData = data.filter((row) => !row.Symbol.includes("."));

  // Map IBKR CSV rows into broker-agnostic fills. The shared matcher
  // sorts, groups by contract, and produces trade drafts downstream.
  return filteredData.map((row) => ({
    symbol: row.Symbol.split(" ")[0],
    option: row["Put/Call"] === "C" ? "CALL" : "PUT",
    strike: parseFloat(row.Strike),
    expiry: parseExpiry(row.Expiry),
    signedQty: parseInt(row.Quantity),
    price: parseFloat(row.TradePrice),
    time: parseDateTime(row.DateTime),
    realizedPnl: parseFloat(row.FifoPnlRealized),
    fee: absFee(row.IBCommission ?? row.Commission) + absFee(row.Taxes),
    tradeId: row.TradeID,
  }));
}

// A single day's account value pulled from an IBKR "Equity Summary in
// Base" Flex query.
export type IbkrEquityPoint = { date: string; total: number };

// Normalise IBKR's ReportDate (usually "yyyyMMdd", sometimes already
// hyphenated) into a "yyyy-MM-dd" key.
function normalizeReportDate(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// Pull the account's daily NAV from a dedicated Flex query configured with
// the "Equity Summary in Base" section. Returns one point per report day,
// oldest first. Column names vary slightly by Flex version, so we match
// the date and total columns case-insensitively.
export async function fetchIbkrEquitySummary(
  userId: string,
): Promise<IbkrEquityPoint[]> {
  await connectDb();
  const user = await User.findById(userId).select(
    "ibkrToken ibkrBalanceQueryId",
  );

  if (!user?.ibkrToken || !user?.ibkrBalanceQueryId) {
    throw new Error("IBKR balance query not configured");
  }

  const csv = await fetchIbkrCsv(user.ibkrToken, user.ibkrBalanceQueryId);

  const { data, meta } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = meta.fields ?? [];
  const findField = (...candidates: string[]) =>
    fields.find((f) =>
      candidates.some((c) => f.toLowerCase() === c.toLowerCase()),
    );
  // "ReportDate" holds the day; "Total" is the account NAV in base
  // currency. Fall back to close-enough alternatives some templates emit.
  const dateField = findField("ReportDate", "Date", "reportDate");
  const totalField = findField("Total", "EndingValue", "NAV", "total");

  if (!dateField || !totalField) {
    throw new Error(
      "IBKR balance query is missing a ReportDate / Total column — add the 'Equity Summary in Base' section (or Change in NAV) to the Flex query.",
    );
  }

  const byDate = new Map<string, number>();
  for (const row of data) {
    const date = normalizeReportDate(row[dateField] ?? "");
    const total = parseFloat(row[totalField] ?? "");
    if (!date || !Number.isFinite(total)) continue;
    // Last row for a given day wins (Flex lists chronologically).
    byDate.set(date, total);
  }

  return [...byDate.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const ibkrAdapter: BrokerAdapter = {
  id: "ibkr",
  label: "Interactive Brokers",
  mode: "pull",
  fetchFills,
};
