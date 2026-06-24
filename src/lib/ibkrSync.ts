import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import Trade from "@/lib/models/Trade";
import Papa from "papaparse";
import { matchFills, type NormalizedFill } from "@/lib/ibkr/match";

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
  second: number
): Date {
  for (const offsetHours of [4, 5]) {
    const candidate = new Date(
      Date.UTC(year, month - 1, day, hour + offsetHours, minute, second)
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
  const match = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
  return match ? match[1].trim() : "";
}

const IBKR_HEADERS = {
  "User-Agent": "Java/1.8.0_192",
};

async function fetchIbkrCsv(token: string, queryId: string): Promise<string> {
  const sendUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${token}&q=${queryId}&v=3`;
  const sendRes = await fetch(sendUrl, { headers: IBKR_HEADERS });
  const sendXml = await sendRes.text();

  const status = extractXmlValue(sendXml, "Status");
  if (status !== "Success") {
    const errorMsg = extractXmlValue(sendXml, "ErrorMessage") || "Unknown error";
    const errorCode = extractXmlValue(sendXml, "ErrorCode");

    // IBKR uses similar "please try again shortly" wording for several
    // distinct failures: a real rate limit, a half-generated statement
    // still on their side, a bad token, a bad queryId, etc. Only the
    // explicit wait-and-retry codes mean "this clears on its own" -
    // everything else is a config problem the user needs to fix. Codes
    // per IBKR Flex docs:
    //   1004               - statement still incomplete on IBKR's side
    //   1018 / 1019 / 1020 - statement throttled, retry after delay
    //   1003 / 1011        - invalid or expired token
    //   1006               - invalid queryId
    const RETRY_CODES = new Set(["1004", "1018", "1019", "1020"]);
    if (RETRY_CODES.has(errorCode)) {
      const err = new Error(
        errorCode === "1004"
          ? "IBKR is still finishing the previous statement for this query. Please wait a few minutes and try again."
          : "IBKR is rate-limiting this query (about one sync every ~15 minutes). Please wait and try again.",
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

export async function syncForUser(userId: string): Promise<{ inserted: number; skipped: number }> {
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

  // Adapt CSV rows into broker-agnostic fills, then hand off to the
  // shared FIFO matcher. The matcher sorts, groups by contract, and
  // produces the trade drafts; we only attach the userID here.
  const fills: NormalizedFill[] = filteredData.map((row) => ({
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

  const trades = matchFills(fills).map((draft) => ({
    ...draft,
    userID: userId,
  }));

  if (trades.length === 0) {
    await User.findByIdAndUpdate(userId, {
      ibkrLastSync: new Date(),
      ibkrLastSyncInserted: 0,
      ibkrLastSyncSkipped: 0,
      ibkrLastSyncTradeIds: [],
    });
    return { inserted: 0, skipped: 0 };
  }

  // Dedupe pass 1: by ibkrTradeId (fast, for trades imported via this sync).
  const ibkrIds = trades.map((t) => t.ibkrTradeId).filter(Boolean);
  const existingIds = ibkrIds.length
    ? await Trade.find({ ibkrTradeId: { $in: ibkrIds } })
        .select("ibkrTradeId")
        .lean()
        .then((docs) => new Set(docs.map((d) => d.ibkrTradeId)))
    : new Set<string>();

  // Dedupe pass 2: by natural key, using the calendar DAY (not exact
  // timestamps). Manual entries store dateBought/dateClosed as midnight
  // UTC, while IBKR-imported trades have real intraday timestamps. Both
  // refer to the same real-world trade if symbol+qty+strike+option match
  // and the buy/sell fall on the same trading day.
  //
  // We use a counter map (multiset) so that if a user legitimately has
  // multiple trades on the same contract on the same day, only that many
  // imports are skipped - the rest are still inserted.
  const dayPart = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  const naturalKey = (t: {
    symbol: string;
    qty: number;
    strike: number;
    option: string;
    dateBought: Date;
    dateClosed?: Date | null;
  }) =>
    `${t.symbol}|${t.qty}|${t.strike}|${t.option}|${dayPart(t.dateBought)}|${dayPart(t.dateClosed)}`;

  const existingByUser = await Trade.find({ userID: userId })
    .select("symbol qty strike option dateBought dateClosed")
    .lean();
  const existingCounts = new Map<string, number>();
  for (const d of existingByUser) {
    const k = naturalKey({
      symbol: d.symbol,
      qty: d.qty,
      strike: d.strike,
      option: d.option,
      dateBought: d.dateBought,
      dateClosed: d.dateClosed,
    });
    existingCounts.set(k, (existingCounts.get(k) ?? 0) + 1);
  }

  const newTrades = trades.filter((t) => {
    if (t.ibkrTradeId && existingIds.has(t.ibkrTradeId)) return false;
    const k = naturalKey(t);
    const remaining = existingCounts.get(k) ?? 0;
    if (remaining > 0) {
      existingCounts.set(k, remaining - 1);
      return false;
    }
    return true;
  });

  let insertedIds: unknown[] = [];
  if (newTrades.length > 0) {
    const inserted = await Trade.insertMany(newTrades);
    insertedIds = inserted.map((d) => d._id);
  }

  const skipped = trades.length - newTrades.length;
  await User.findByIdAndUpdate(userId, {
    ibkrLastSync: new Date(),
    ibkrLastSyncInserted: newTrades.length,
    ibkrLastSyncSkipped: skipped,
    ibkrLastSyncTradeIds: insertedIds,
  });

  return { inserted: newTrades.length, skipped };
}
