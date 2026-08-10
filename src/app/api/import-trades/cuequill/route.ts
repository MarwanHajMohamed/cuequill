import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import Papa from "papaparse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Imports the "All trades" CSV produced by Reports → All trades (see
// lib/reports.ts allTradesTable). This is a round-trip of the user's own
// export, so it maps the export columns straight back onto Trade fields and
// skips rows that already exist (by a per-trade signature) so re-importing the
// same file doesn't duplicate the journal.

// Expected headers (order-independent), matching allTradesTable():
//   Symbol, Type, Status, Qty, Strike, Contract price, Closing price,
//   Date bought, Time entered, Expiry, Date closed, Time exited,
//   Gross P/L, Fees, Net P/L, Strategy, Tags, Simulated, Notes
type Row = Record<string, string>;

const num = (v: string | undefined): number | null => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

// Parse a "yyyy-MM-dd" cell as a local calendar day (the export writes local
// days). Returns null for empty/invalid.
const day = (v: string | undefined): Date | null => {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v.trim())) return null;
  const d = new Date(`${v.trim().slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dayKey = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

// A stable fingerprint for a trade, granular enough that two genuinely
// different trades (different time/price) don't collide, so re-imports dedupe
// but real trades aren't dropped.
function signature(t: {
  symbol: string;
  option: string;
  strike?: number;
  qty: number;
  contractPrice: number;
  dateBought: Date;
  timeEntered?: string;
  status: string;
  closingContractPrice?: number | null;
  dateClosed?: Date | null;
  timeExited?: string;
}): string {
  return [
    t.symbol,
    t.option,
    t.strike ?? "",
    t.qty,
    t.contractPrice,
    dayKey(t.dateBought),
    t.timeEntered ?? "",
    t.status,
    t.closingContractPrice ?? "",
    dayKey(t.dateClosed),
    t.timeExited ?? "",
  ].join("|");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const userId = new mongoose.Types.ObjectId(session.user.id);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Strip a leading BOM (the export writes one) so the first header isn't
  // read as "﻿Symbol".
  const text = (await file.text()).replace(/^﻿/, "");
  const { data } = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/^﻿/, "").trim(),
  });

  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json(
      { error: "That CSV had no rows. Export it from Reports → All trades." },
      { status: 400 },
    );
  }

  // Sanity-check that this looks like the All-trades export.
  const first = data[0] ?? {};
  if (!("Symbol" in first) || !("Contract price" in first)) {
    return NextResponse.json(
      {
        error:
          "This doesn't look like a Cuequill All-trades CSV. Use Reports → All trades → Download CSV.",
      },
      { status: 400 },
    );
  }

  type NewTrade = {
    userID: mongoose.Types.ObjectId;
    symbol: string;
    option: "CALL" | "PUT";
    status: "OPEN" | "WIN" | "LOSS";
    qty: number;
    strike?: number;
    contractPrice: number;
    closingContractPrice?: number;
    dateBought: Date;
    timeEntered?: string;
    expiryDate: Date;
    dateClosed?: Date;
    timeExited?: string;
    profitLoss?: number;
    fees: number;
    strategy?: string;
    notes: string;
    tags: string[];
    simulated: boolean;
    favourite: boolean;
  };

  let skipped = 0;
  const candidates: NewTrade[] = [];

  for (const row of data) {
    const symbol = (row["Symbol"] ?? "").trim().toUpperCase();
    const option =
      row["Type"] === "CALL" ? "CALL" : row["Type"] === "PUT" ? "PUT" : null;
    const statusRaw = (row["Status"] ?? "").trim().toUpperCase();
    const status =
      statusRaw === "WIN" || statusRaw === "LOSS" || statusRaw === "OPEN"
        ? (statusRaw as "WIN" | "LOSS" | "OPEN")
        : null;
    const qty = num(row["Qty"]);
    const contractPrice = num(row["Contract price"]);
    const dateBought = day(row["Date bought"]);

    // Required fields to make a valid trade.
    if (
      !symbol ||
      !option ||
      !status ||
      qty == null ||
      qty <= 0 ||
      contractPrice == null ||
      !dateBought
    ) {
      skipped += 1;
      continue;
    }

    const closed = status === "WIN" || status === "LOSS";
    const strike = num(row["Strike"]) ?? undefined;
    const closingContractPrice = num(row["Closing price"]) ?? undefined;
    const expiryDate = day(row["Expiry"]) ?? dateBought;
    const dateClosed = day(row["Date closed"]) ?? undefined;
    const fees = num(row["Fees"]) ?? 0;
    // The export's "Gross P/L" IS profitLoss (net is derived as gross − fees).
    // Fall back to computing gross from prices when the cell is blank.
    let gross = num(row["Gross P/L"]);
    if (closed && gross == null && closingContractPrice != null) {
      gross = (closingContractPrice - contractPrice) * 100 * qty;
    }
    const timeEntered = (row["Time entered"] ?? "").trim() || undefined;
    const timeExited = (row["Time exited"] ?? "").trim() || undefined;
    const tags = (row["Tags"] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    candidates.push({
      userID: userId,
      symbol,
      option,
      status,
      qty,
      strike,
      contractPrice,
      closingContractPrice: closed ? closingContractPrice : undefined,
      dateBought,
      timeEntered,
      expiryDate,
      dateClosed: closed ? dateClosed : undefined,
      timeExited: closed ? timeExited : undefined,
      profitLoss: closed ? (gross ?? 0) : undefined,
      fees,
      strategy: (row["Strategy"] ?? "").trim() || undefined,
      notes: (row["Notes"] ?? "").trim(),
      tags,
      simulated: (row["Simulated"] ?? "").trim().toLowerCase() === "yes",
      favourite: false,
    });
  }

  // Dedupe against what's already in the journal and within the batch itself.
  const existing = await Trade.find({ userID: userId })
    .select(
      "symbol option strike qty contractPrice dateBought timeEntered status closingContractPrice dateClosed timeExited",
    )
    .lean<
      {
        symbol: string;
        option: string;
        strike?: number;
        qty: number;
        contractPrice: number;
        dateBought: Date;
        timeEntered?: string;
        status: string;
        closingContractPrice?: number | null;
        dateClosed?: Date | null;
        timeExited?: string;
      }[]
    >();
  const seen = new Set(existing.map(signature));

  let duplicates = 0;
  const toInsert: NewTrade[] = [];
  for (const c of candidates) {
    const sig = signature(c);
    if (seen.has(sig)) {
      duplicates += 1;
      continue;
    }
    seen.add(sig);
    toInsert.push(c);
  }

  if (toInsert.length > 0) {
    await Trade.insertMany(toInsert);
  }

  return NextResponse.json({
    success: true,
    inserted: toInsert.length,
    duplicates,
    skipped,
  });
}
