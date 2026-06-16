import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import Trade from "@/lib/models/Trade";
import Papa from "papaparse";

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

type CsvRowWithQty = CsvRow & {
  remainingQty: number;
  // Buy-side commission per contract, derived once when the buy is
  // enqueued. Avoids dividing by qty again at every fill.
  commissionPerContract: number;
};

// Parses IBKR commission/fee strings. Returns absolute value (IBKR
// reports debits as negatives; we store fees as positive). Empty or
// missing values yield 0.
function absFee(s: string | undefined | null): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

// Total fees on a CSV row = IBCommission (or Commission alias) + Taxes,
// per contract. We divide here because IBKR reports a single combined
// charge for the whole order, but we may split that order across
// multiple matched fills.
function feesPerContract(row: CsvRow, qty: number): number {
  if (qty <= 0) return 0;
  const comm = absFee(row.IBCommission ?? row.Commission);
  const taxes = absFee(row.Taxes);
  return (comm + taxes) / qty;
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
    if (/could not be generated|try again/i.test(errorMsg)) {
      const err = new Error(
        "IBKR allows roughly one sync every ~15 minutes per query. Please wait and try again."
      );
      (err as Error & { code?: string }).code = "RATE_LIMITED";
      throw err;
    }
    throw new Error(`IBKR request failed: ${errorMsg}`);
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
      throw new Error(`IBKR retrieval failed: ${errorMsg}`);
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
  filteredData.sort(
    (a, b) => parseDateTime(a.DateTime).getTime() - parseDateTime(b.DateTime).getTime()
  );

  const grouped: Record<string, CsvRow[]> = {};
  filteredData.forEach((row) => {
    const key = `${row.Symbol}-${row.Strike}-${row.Expiry}-${row["Put/Call"]}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });

  const trades = [];

  for (const key in grouped) {
    const rows = grouped[key];
    const openQueue: CsvRowWithQty[] = [];

    for (const row of rows) {
      const signedQty = parseInt(row.Quantity);
      const qty = Math.abs(signedQty);

      if (signedQty > 0) {
        openQueue.push({
          ...row,
          remainingQty: qty,
          commissionPerContract: feesPerContract(row, qty),
        });
      } else if (signedQty < 0) {
        let remainingSell = qty;
        const sellCommissionPerContract = feesPerContract(row, qty);

        while (remainingSell > 0 && openQueue.length > 0) {
          const buyRow = openQueue[0];
          const matchQty = Math.min(buyRow.remainingQty, remainingSell);
          const pnl = (parseFloat(row.FifoPnlRealized) / qty) * matchQty;
          // Round-trip fees on the matched portion = buy share + sell
          // share. Rounded to 4dp so a precise sum still looks clean
          // when displayed (display layer truncates further).
          const fees =
            Math.round(
              (buyRow.commissionPerContract + sellCommissionPerContract) *
                matchQty *
                10000,
            ) / 10000;

          trades.push({
            userID: userId,
            symbol: buyRow.Symbol.split(" ")[0],
            option: buyRow["Put/Call"] === "C" ? "CALL" : "PUT",
            strike: parseFloat(buyRow.Strike),
            qty: matchQty,
            contractPrice: parseFloat(buyRow.TradePrice),
            dateBought: parseDateTime(buyRow.DateTime),
            expiryDate: parseExpiry(buyRow.Expiry),
            dateClosed: parseDateTime(row.DateTime),
            closingContractPrice: parseFloat(row.TradePrice),
            profitLoss: pnl,
            fees,
            status: pnl > 0 ? "WIN" : "LOSS",
            simulated: false,
            notes: "",
            strategy: "Other",
            favourite: false,
            ...(row.TradeID && { ibkrTradeId: `${buyRow.TradeID}-${row.TradeID}` }),
          });

          buyRow.remainingQty -= matchQty;
          remainingSell -= matchQty;
          if (buyRow.remainingQty <= 0) openQueue.shift();
        }
      }
    }

    for (const buyRow of openQueue) {
      // Open trades only carry the buy-side commission. The sell-side
      // portion is added when the closing fill arrives on a later sync.
      const fees =
        Math.round(
          buyRow.commissionPerContract * buyRow.remainingQty * 10000,
        ) / 10000;

      trades.push({
        userID: userId,
        symbol: buyRow.Symbol.split(" ")[0],
        option: buyRow["Put/Call"] === "C" ? "CALL" : "PUT",
        strike: parseFloat(buyRow.Strike),
        qty: buyRow.remainingQty,
        contractPrice: parseFloat(buyRow.TradePrice),
        dateBought: parseDateTime(buyRow.DateTime),
        expiryDate: parseExpiry(buyRow.Expiry),
        fees,
        status: "OPEN",
        simulated: false,
        ...(buyRow.TradeID && { ibkrTradeId: buyRow.TradeID }),
      });
    }
  }

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
