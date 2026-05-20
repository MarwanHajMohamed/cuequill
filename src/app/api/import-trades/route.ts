import { NextResponse } from "next/server";

import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import Papa from "papaparse";
import { Trade as TradeType } from "@/app/types/Trades";

type CsvRow = {
  Symbol: string;
  Strike: string;
  Expiry: string;
  "Put/Call": "C" | "P";
  Quantity: string;
  TradePrice: string;
  DateTime: string;
  FifoPnlRealized: string;
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

export async function POST(req: Request) {
  await connectDb();

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const { data } = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  // Filter out forex trades like GBP.USD, EUR.USD etc.
  const filteredData = data.filter((row) => !row.Symbol.includes("."));

  filteredData.sort((a: CsvRow, b: CsvRow) => {
    return (
      parseDateTime(a.DateTime).getTime() - parseDateTime(b.DateTime).getTime()
    );
  });

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
        });
      } else if (signedQty < 0) {
        let remainingSell = qty;

        while (remainingSell > 0 && openQueue.length > 0) {
          const buyRow = openQueue[0];
          const matchQty = Math.min(buyRow.remainingQty, remainingSell);

          const trade: TradeType = {
            userID: userId,
            symbol: buyRow.Symbol.split(" ")[0],
            option: buyRow["Put/Call"] === "C" ? "CALL" : "PUT",
            strike: parseFloat(buyRow.Strike),
            qty: matchQty,
            contractPrice: parseFloat(buyRow.TradePrice),
            dateBought: parseDateTime(buyRow.DateTime).toLocaleString(),
            expiryDate: parseExpiry(buyRow.Expiry).toLocaleString(),
            dateClosed: parseDateTime(row.DateTime).toLocaleString(),
            closingContractPrice: parseFloat(row.TradePrice),
            profitLoss: (parseFloat(row.FifoPnlRealized) / qty) * matchQty,
            status:
              (parseFloat(row.FifoPnlRealized) / qty) * matchQty > 0
                ? "WIN"
                : "LOSS",
            simulated: false,
            notes: "",
            strategy: "Other",
            favourite: false,
          };

          trades.push(trade);

          buyRow.remainingQty -= matchQty;
          remainingSell -= matchQty;

          if (buyRow.remainingQty <= 0) {
            openQueue.shift();
          }
        }
      }
    }

    for (const buyRow of openQueue) {
      trades.push({
        userID: userId,
        symbol: buyRow.Symbol,
        option: buyRow["Put/Call"] === "C" ? "CALL" : "PUT",
        strike: parseFloat(buyRow.Strike),
        qty: buyRow.remainingQty,
        contractPrice: parseFloat(buyRow.TradePrice),
        dateBought: parseDateTime(buyRow.DateTime),
        expiryDate: parseExpiry(buyRow.Expiry),
        status: "OPEN",
        simulated: false,
      });
    }
  }

  await Trade.insertMany(trades);

  return NextResponse.json({ success: true, inserted: trades.length });
}
