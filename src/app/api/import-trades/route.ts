import { NextResponse } from "next/server";

import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import Papa from "papaparse";

type CsvRow = {
  Symbol: string;
  Strike: string;
  Expiry: string;
  "Put/Call": "C" | "P";
  "Buy/Sell": "BUY" | "SELL";
  Quantity: string;
  TradePrice: string;
  DateTime: string;
  FifoPnlRealized: string;
};

// When you need to add remainingQty:
type CsvRowWithQty = CsvRow & { remainingQty: number };

function parseDateTime(dateStr: string) {
  const [date, time] = dateStr.split(";");
  const year = parseInt(date.substring(0, 4));
  const month = parseInt(date.substring(4, 6)) - 1;
  const day = parseInt(date.substring(6, 8));
  const hour = parseInt(time.substring(0, 2));
  const minute = parseInt(time.substring(2, 4));
  const second = parseInt(time.substring(4, 6));
  return new Date(year, month, day, hour, minute, second);
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

  data.sort((a: CsvRow, b: CsvRow) => {
    return (
      parseDateTime(a.DateTime).getTime() - parseDateTime(b.DateTime).getTime()
    );
  });

  const grouped: Record<string, CsvRow[]> = {};
  data.forEach((row) => {
    const key = `${row.Symbol}-${row.Strike}-${row.Expiry}-${row["Put/Call"]}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });

  const trades = [];

  for (const key in grouped) {
    const rows = grouped[key];
    const openQueue: CsvRowWithQty[] = [];

    for (const row of rows) {
      const qty = Math.abs(parseInt(row.Quantity));

      if (row["Buy/Sell"] === "BUY") {
        openQueue.push({
          ...row,
          remainingQty: qty,
        });
      } else if (row["Buy/Sell"] === "SELL") {
        let remainingSell = qty;

        while (remainingSell > 0 && openQueue.length > 0) {
          const buyRow = openQueue[0];
          const matchQty = Math.min(buyRow.remainingQty, remainingSell);

          // Create a trade record
          const trade = {
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
            profitLoss: (parseFloat(row.FifoPnlRealized) / qty) * matchQty,
            status:
              (parseFloat(row.FifoPnlRealized) / qty) * matchQty > 0
                ? "WIN"
                : "LOSS",
            simulated: false,
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
