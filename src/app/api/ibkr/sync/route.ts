import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
};

type CsvRowWithQty = CsvRow & { remainingQty: number };

// IBKR Flex CSV timestamps are in ET. Convert to a true UTC instant.
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

  // Poll up to 5 times with 10s delay
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

async function syncForUser(userId: string): Promise<{ inserted: number; skipped: number }> {
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
        openQueue.push({ ...row, remainingQty: qty });
      } else if (signedQty < 0) {
        let remainingSell = qty;

        while (remainingSell > 0 && openQueue.length > 0) {
          const buyRow = openQueue[0];
          const matchQty = Math.min(buyRow.remainingQty, remainingSell);
          const pnl = (parseFloat(row.FifoPnlRealized) / qty) * matchQty;

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
      trades.push({
        userID: userId,
        symbol: buyRow.Symbol.split(" ")[0],
        option: buyRow["Put/Call"] === "C" ? "CALL" : "PUT",
        strike: parseFloat(buyRow.Strike),
        qty: buyRow.remainingQty,
        contractPrice: parseFloat(buyRow.TradePrice),
        dateBought: parseDateTime(buyRow.DateTime),
        expiryDate: parseExpiry(buyRow.Expiry),
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
    });
    return { inserted: 0, skipped: 0 };
  }

  // Deduplicate: skip trades whose ibkrTradeId already exists
  const ibkrIds = trades.map((t) => t.ibkrTradeId).filter(Boolean);
  const existingIds = ibkrIds.length
    ? await Trade.find({ ibkrTradeId: { $in: ibkrIds } })
        .select("ibkrTradeId")
        .lean()
        .then((docs) => new Set(docs.map((d) => d.ibkrTradeId)))
    : new Set<string>();

  const newTrades = trades.filter(
    (t) => !t.ibkrTradeId || !existingIds.has(t.ibkrTradeId)
  );

  if (newTrades.length > 0) {
    await Trade.insertMany(newTrades);
  }

  const skipped = trades.length - newTrades.length;
  await User.findByIdAndUpdate(userId, {
    ibkrLastSync: new Date(),
    ibkrLastSyncInserted: newTrades.length,
    ibkrLastSyncSkipped: skipped,
  });

  return { inserted: newTrades.length, skipped };
}

// Manual sync triggered from the settings UI
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncForUser(session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export { syncForUser };
