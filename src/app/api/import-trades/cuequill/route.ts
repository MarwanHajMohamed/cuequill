import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import Papa from "papaparse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Backups with embedded base64 images can be large; give the import room so a
// big batch isn't cut off mid-insert.
export const maxDuration = 120;

// Imports a Cuequill self-export back into the journal. Two formats are
// accepted, both produced by the Reports page:
//   - CSV  : Reports → All trades → Download CSV (column-mapped rows).
//   - JSON : Reports → Full backup → Download JSON (raw Trade objects,
//            shaped as { exportedAt, count, trades: [...] }).
// Either way it's a round-trip of the user's own data, so rows/objects map
// straight back onto Trade fields and anything already present is skipped (by
// a per-trade signature) so re-importing the same file doesn't duplicate the
// journal.

// Expected CSV headers (order-independent), matching allTradesTable():
//   Symbol, Type, Status, Qty, Strike, Contract price, Closing price,
//   Date bought, Time entered, Expiry, Date closed, Time exited,
//   Gross P/L, Fees, Net P/L, Strategy, Tags, Simulated, Notes
type Row = Record<string, string>;

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

type Parsed = { candidates: NewTrade[]; skipped: number };

const num = (v: string | undefined): number | null => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

// Coerce a JSON value (number or numeric string) to a finite number, else null.
const asNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

// Parse a "yyyy-MM-dd" CSV cell as a local calendar day (the export writes
// local days). Returns null for empty/invalid.
const day = (v: string | undefined): Date | null => {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v.trim())) return null;
  const d = new Date(`${v.trim().slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Parse any date value from the JSON backup (ISO strings, "yyyy-MM-dd", or a
// timestamp). Returns null for empty/invalid.
const asDate = (v: unknown): Date | null => {
  if (v == null || v === "") return null;
  // A bare "yyyy-MM-dd" is a local calendar day, same as the CSV path.
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
    return day(v);
  }
  const d = new Date(v as string | number);
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

// Map the All-trades CSV rows onto Trade candidates. Returns null when the
// file doesn't look like that export at all.
function parseCsv(
  text: string,
  userId: mongoose.Types.ObjectId,
): Parsed | null {
  const { data } = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/^﻿/, "").trim(),
  });

  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0] ?? {};
  if (!("Symbol" in first) || !("Contract price" in first)) return null;

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

  return { candidates, skipped };
}

// Map the Full-backup JSON (raw Trade objects) onto Trade candidates. Accepts
// both the wrapped `{ trades: [...] }` shape and a bare array. Returns null
// when the payload isn't valid JSON or carries no trades array.
function parseBackupJson(
  text: string,
  userId: mongoose.Types.ObjectId,
): Parsed | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const trades: unknown = Array.isArray(parsed)
    ? parsed
    : (parsed as { trades?: unknown } | null)?.trades;
  if (!Array.isArray(trades)) return null;

  let skipped = 0;
  const candidates: NewTrade[] = [];

  for (const raw of trades) {
    const t = (raw ?? {}) as Record<string, unknown>;
    const symbol = String(t.symbol ?? "").trim().toUpperCase();
    const option =
      t.option === "CALL" ? "CALL" : t.option === "PUT" ? "PUT" : null;
    const statusRaw = String(t.status ?? "").trim().toUpperCase();
    const status =
      statusRaw === "WIN" || statusRaw === "LOSS" || statusRaw === "OPEN"
        ? (statusRaw as "WIN" | "LOSS" | "OPEN")
        : null;
    const qty = asNum(t.qty);
    const contractPrice = asNum(t.contractPrice);
    const dateBought = asDate(t.dateBought);

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
    const strike = asNum(t.strike) ?? undefined;
    const closingContractPrice = asNum(t.closingContractPrice) ?? undefined;
    const expiryDate = asDate(t.expiryDate) ?? dateBought;
    const dateClosed = asDate(t.dateClosed) ?? undefined;
    const fees = asNum(t.fees) ?? 0;
    // profitLoss on a Trade is the GROSS figure (net is gross − fees).
    const profitLoss = asNum(t.profitLoss);
    const timeEntered = String(t.timeEntered ?? "").trim() || undefined;
    const timeExited = String(t.timeExited ?? "").trim() || undefined;
    const tags = Array.isArray(t.tags)
      ? t.tags.map((x) => String(x).trim()).filter(Boolean)
      : [];

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
      profitLoss: closed ? (profitLoss ?? 0) : undefined,
      fees,
      strategy: String(t.strategy ?? "").trim() || undefined,
      notes: String(t.notes ?? "").trim(),
      tags,
      simulated: !!t.simulated,
      favourite: !!t.favourite,
    });
  }

  return { candidates, skipped };
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

  // Strip a leading BOM (the CSV export writes one) so the first header isn't
  // read as "﻿Symbol" and JSON.parse doesn't choke on it.
  const text = (await file.text()).replace(/^﻿/, "");

  // Decide CSV vs JSON by extension / content-type, falling back to sniffing
  // the first non-space character.
  const looksJson =
    /\.json$/i.test(file.name) ||
    file.type === "application/json" ||
    /^\s*[[{]/.test(text);

  let parsed: Parsed | null;
  if (looksJson) {
    parsed = parseBackupJson(text, userId);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "This doesn't look like a Cuequill JSON backup. Use Reports → Full backup → Download JSON.",
        },
        { status: 400 },
      );
    }
  } else {
    parsed = parseCsv(text, userId);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "This doesn't look like a Cuequill export. Use Reports → All trades (CSV) or Full backup (JSON).",
        },
        { status: 400 },
      );
    }
  }

  const { candidates, skipped } = parsed;

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

  // MongoDB caps a single document at 16MB. A trade whose notes embed large
  // base64 images (the rich-notes editor inlines them) can exceed that. With
  // an ordered insert, one oversized document aborts every trade queued after
  // it, so the import "stops" partway. Strip the inline image data from any
  // oversized note - keeping the surrounding text - so the trade still fits.
  const MAX_DOC_BYTES = 15_000_000;
  const stripDataUris = (s: string) => s.replace(/data:[^"')\s>]+/gi, "");
  let trimmed = 0;
  for (const c of toInsert) {
    if (Buffer.byteLength(JSON.stringify(c)) <= MAX_DOC_BYTES) continue;
    const before = c.notes;
    c.notes = stripDataUris(c.notes);
    if (Buffer.byteLength(JSON.stringify(c)) > MAX_DOC_BYTES) {
      c.notes = c.notes.slice(0, 100_000); // last-resort cap on huge text
    }
    if (c.notes !== before) trimmed += 1;
  }

  // Insert in small chunks; if a chunk fails for any reason, fall back to
  // inserting its rows one at a time so a single bad row can never stop the
  // others. This is belt-and-braces over the trimming above - whatever makes
  // one trade unstorable, the rest of the import still goes through.
  let inserted = 0;
  let failed = 0;
  const CHUNK = 25;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    try {
      const docs = await Trade.insertMany(chunk, { ordered: false });
      inserted += docs.length;
    } catch (chunkErr) {
      console.error("[import-trades/cuequill] chunk insert failed", chunkErr);
      for (const doc of chunk) {
        try {
          await Trade.create(doc);
          inserted += 1;
        } catch (rowErr) {
          failed += 1;
          console.error("[import-trades/cuequill] row insert failed", rowErr);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    inserted,
    duplicates,
    skipped,
    failed,
    trimmed,
  });
}
