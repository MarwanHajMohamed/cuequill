import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import mongoose from "mongoose";
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionCall,
  type FunctionDeclaration,
} from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/chat
// Body: { messages: [{ role: "user" | "model", text: string }, ...] }
// Streams Gemini response as text/plain chunks (Server-Sent style but
// raw text - the client just appends them).
//
// Free-tier setup:
//   1. Get a key from https://aistudio.google.com/apikey
//   2. Set GEMINI_API_KEY in env
//   3. Model defaults to gemini-2.5-flash (generous free quota)

type IncomingMsg = { role: "user" | "model"; text: string };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Pro gate. Read the live DB flag so a Pro who upgraded mid-session
  // can use chat without re-logging-in, and a downgrade kicks in
  // immediately for stale JWTs.
  await connectDb();
  const proCheck = await User.findById(session.user.id)
    .select("isPro")
    .lean<{ isPro?: boolean }>();
  if (!proCheck?.isPro) {
    return new Response("Pro membership required", { status: 403 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("GEMINI_API_KEY not set", { status: 500 });
  }

  let body: { messages?: IncomingMsg[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const messages = (body.messages ?? []).filter(
    (m) => (m.role === "user" || m.role === "model") && typeof m.text === "string",
  );
  if (messages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  // ── Load trades context for this user ───────────────────────────────
  const userId = new mongoose.Types.ObjectId(session.user.id);
  // Pull a wide history. Gemini 2.5 Flash has a 1M-token context window;
  // 1000 compact trade rows is ~80KB - trivial to ship.
  const trades = (await Trade.find({ userID: userId, simulated: false })
    .sort({ dateBought: -1 })
    .limit(1000)
    .lean()) as unknown as LeanTrade[];

  const context = buildTradeContext(trades);

  // Build a today-reference block so Gemini can resolve relative dates
  // like "today", "Friday", "next Monday" correctly. LLMs don't know the
  // current date on their own.
  const userTz = session.user.timezone || "America/New_York";
  const dateBlock = buildDateContext(userTz);

  // ── Build Gemini request ────────────────────────────────────────────
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT(
      session.user.firstname ?? "trader",
      context,
      dateBlock,
    ),
    tools: [{ functionDeclarations: [ADD_TRADE_TOOL, EDIT_TRADE_TOOL] }],
  });

  // Convert our message history into Gemini's format. The last message
  // is the new prompt; earlier ones become chat history.
  const last = messages[messages.length - 1];
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const chat = model.startChat({
    history,
    tools: [{ functionDeclarations: [ADD_TRADE_TOOL, EDIT_TRADE_TOOL] }],
  });

  // ── Stream the response back ────────────────────────────────────────
  // Sentinel emitted at the end of any response that touched the trades
  // collection - the client uses it to invalidate its react-query cache.
  // A null byte won't appear in Gemini's natural-language output.
  const REFRESH_SENTINEL = "[[CUEQUILL_REFRESH_TRADES]]";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const drainStream = async (
        result: Awaited<ReturnType<typeof chat.sendMessageStream>>,
      ): Promise<FunctionCall[]> => {
        const collected: FunctionCall[] = [];
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
          const fc = chunk.functionCalls();
          if (fc && fc.length) collected.push(...fc);
        }
        return collected;
      };

      try {
        let touchedTrades = false;
        let result = await chat.sendMessageStream(last.text);
        let calls = await drainStream(result);

        // Loop in case Gemini chains tool calls. Bounded so a hallucinating
        // model can't spin us forever.
        for (let i = 0; i < 4 && calls.length > 0; i++) {
          const fnResponses = [];
          for (const call of calls) {
            if (call.name === "add_trade") {
              const res = await executeAddTrade(
                session.user.id,
                call.args as Record<string, unknown>,
              );
              if (res.ok) touchedTrades = true;
              fnResponses.push({
                functionResponse: { name: call.name, response: res },
              });
            } else if (call.name === "edit_trade") {
              const res = await executeEditTrade(
                session.user.id,
                call.args as Record<string, unknown>,
              );
              if (res.ok) touchedTrades = true;
              fnResponses.push({
                functionResponse: { name: call.name, response: res },
              });
            } else {
              fnResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { ok: false, error: "Unknown tool" },
                },
              });
            }
          }
          result = await chat.sendMessageStream(fnResponses);
          calls = await drainStream(result);
        }

        if (touchedTrades) {
          controller.enqueue(encoder.encode(REFRESH_SENTINEL));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// ── Tool: add_trade ────────────────────────────────────────────────────

const ADD_TRADE_TOOL: FunctionDeclaration = {
  name: "add_trade",
  description:
    "Logs a new US options trade in the user's journal. Use ONLY when the user explicitly asks to log/add/record a trade. If any required field is missing or ambiguous, ASK the user a clarifying question first instead of calling this tool. After the trade is added, briefly confirm what was saved.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: {
        type: SchemaType.STRING,
        description:
          "Ticker symbol, uppercase (e.g. SPY, AAPL, NVDA). No leading $.",
      },
      option: {
        type: SchemaType.STRING,
        description: "Direction: CALL or PUT.",
        enum: ["CALL", "PUT"],
        format: "enum",
      },
      qty: {
        type: SchemaType.NUMBER,
        description: "Number of contracts. Must be a positive integer.",
      },
      strike: {
        type: SchemaType.NUMBER,
        description: "Strike price of the option, in USD.",
      },
      contractPrice: {
        type: SchemaType.NUMBER,
        description: "Premium paid per contract at entry, in USD.",
      },
      dateBought: {
        type: SchemaType.STRING,
        description:
          "Entry date in ISO YYYY-MM-DD. If the user says 'today' use today's date; 'yesterday' is the prior day, etc.",
      },
      expiryDate: {
        type: SchemaType.STRING,
        description: "Expiration date in ISO YYYY-MM-DD.",
      },
      strategy: {
        type: SchemaType.STRING,
        description:
          "Optional strategy name. Pick the closest match from the strategies you can see in the snapshot if the user named one.",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Optional free-text notes for this trade.",
      },
    },
    required: [
      "symbol",
      "option",
      "qty",
      "strike",
      "contractPrice",
      "dateBought",
      "expiryDate",
    ],
  },
};

type AddTradeArgs = {
  symbol?: string;
  option?: "CALL" | "PUT";
  qty?: number;
  strike?: number;
  contractPrice?: number;
  dateBought?: string;
  expiryDate?: string;
  strategy?: string;
  notes?: string;
};

async function executeAddTrade(
  userId: string,
  rawArgs: Record<string, unknown>,
): Promise<
  | { ok: true; trade: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const a = rawArgs as AddTradeArgs;
  // Defensive validation - Gemini's schema enforcement is good but not
  // perfect, and we don't want a bad call to crash the route.
  const symbol = (a.symbol ?? "").toString().trim().toUpperCase();
  const option =
    a.option === "CALL" || a.option === "PUT" ? a.option : undefined;
  const qty = Number(a.qty);
  const strike = Number(a.strike);
  const contractPrice = Number(a.contractPrice);
  const dateBought = parseDateOnly(a.dateBought);
  const expiryDate = parseDateOnly(a.expiryDate);

  if (!symbol) return { ok: false, error: "Missing symbol" };
  if (!option) return { ok: false, error: "Missing option (CALL or PUT)" };
  if (!Number.isFinite(qty) || qty <= 0)
    return { ok: false, error: "qty must be a positive number" };
  if (!Number.isFinite(strike) || strike <= 0)
    return { ok: false, error: "strike must be a positive number" };
  if (!Number.isFinite(contractPrice) || contractPrice <= 0)
    return { ok: false, error: "contractPrice must be a positive number" };
  if (!dateBought) return { ok: false, error: "Invalid dateBought" };
  if (!expiryDate) return { ok: false, error: "Invalid expiryDate" };
  if (expiryDate < dateBought)
    return { ok: false, error: "Expiry can't be before entry date" };

  try {
    await connectDb();
    const created = await Trade.create({
      userID: new mongoose.Types.ObjectId(userId),
      symbol,
      option,
      qty,
      strike,
      contractPrice,
      dateBought,
      expiryDate,
      status: "OPEN",
      simulated: false,
      strategy: a.strategy?.toString().trim() || undefined,
      notes: a.notes?.toString().trim() || undefined,
    });
    return {
      ok: true,
      trade: {
        id: created._id?.toString(),
        symbol,
        option,
        qty,
        strike,
        contractPrice,
        dateBought: dateBought.toISOString().slice(0, 10),
        expiryDate: expiryDate.toISOString().slice(0, 10),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ── Tool: edit_trade ───────────────────────────────────────────────────

const EDIT_TRADE_TOOL: FunctionDeclaration = {
  name: "edit_trade",
  description:
    "Update fields on an EXISTING trade in the user's journal - including closing it (status=WIN/LOSS), fixing a typo, changing strategy, adding notes, etc. The id MUST come from the [id:…] tag at the start of a trade row in the snapshot. Only fields you pass are changed; everything else stays. If the user is ambiguous about which trade, ASK before calling. To close a trade, set status to WIN or LOSS and ideally also set closingContractPrice, dateClosed, and profitLoss.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      id: {
        type: SchemaType.STRING,
        description:
          "The 24-char Mongo ObjectId of the trade - copy it from the [id:…] tag in the TRADER SNAPSHOT.",
      },
      symbol: { type: SchemaType.STRING, description: "Ticker." },
      option: {
        type: SchemaType.STRING,
        description: "CALL or PUT.",
        enum: ["CALL", "PUT"],
        format: "enum",
      },
      qty: { type: SchemaType.NUMBER, description: "Contracts." },
      strike: { type: SchemaType.NUMBER, description: "Strike, USD." },
      contractPrice: {
        type: SchemaType.NUMBER,
        description: "Entry premium per contract, USD.",
      },
      dateBought: {
        type: SchemaType.STRING,
        description: "Entry date YYYY-MM-DD.",
      },
      expiryDate: {
        type: SchemaType.STRING,
        description: "Expiry date YYYY-MM-DD.",
      },
      status: {
        type: SchemaType.STRING,
        description: "OPEN, WIN, or LOSS. Setting WIN/LOSS closes the trade.",
        enum: ["OPEN", "WIN", "LOSS"],
        format: "enum",
      },
      closingContractPrice: {
        type: SchemaType.NUMBER,
        description: "Exit premium per contract, USD.",
      },
      dateClosed: {
        type: SchemaType.STRING,
        description: "Close date YYYY-MM-DD.",
      },
      profitLoss: {
        type: SchemaType.NUMBER,
        description:
          "Realized P/L in USD (already inclusive of qty × 100 multiplier). Negative for losses.",
      },
      fees: {
        type: SchemaType.NUMBER,
        description:
          "Total commissions/fees for the round-trip, USD. Subtracted from profitLoss for net P/L.",
      },
      strategy: {
        type: SchemaType.STRING,
        description: "Strategy name.",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Free-text notes (replaces any existing notes).",
      },
      favourite: {
        type: SchemaType.BOOLEAN,
        description: "Flag the trade as a favourite.",
      },
    },
    required: ["id"],
  },
};

type EditTradeArgs = {
  id?: string;
  symbol?: string;
  option?: "CALL" | "PUT";
  qty?: number;
  strike?: number;
  contractPrice?: number;
  dateBought?: string;
  expiryDate?: string;
  status?: "OPEN" | "WIN" | "LOSS";
  closingContractPrice?: number;
  dateClosed?: string;
  profitLoss?: number;
  fees?: number;
  strategy?: string;
  notes?: string;
  favourite?: boolean;
};

async function executeEditTrade(
  userId: string,
  rawArgs: Record<string, unknown>,
): Promise<
  | { ok: true; trade: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const a = rawArgs as EditTradeArgs;
  const id = (a.id ?? "").toString().trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false, error: "Invalid or missing trade id" };
  }

  await connectDb();
  const existing = await Trade.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userID: new mongoose.Types.ObjectId(userId),
  });
  if (!existing) {
    return { ok: false, error: "Trade not found (or not yours)" };
  }

  // Build a sparse $set patch - only fields actually supplied. This way
  // a Gemini call that names just one field doesn't blank everything else.
  const patch: Record<string, unknown> = {};

  if (a.symbol !== undefined)
    patch.symbol = String(a.symbol).trim().toUpperCase();
  if (a.option !== undefined) {
    if (a.option !== "CALL" && a.option !== "PUT")
      return { ok: false, error: "option must be CALL or PUT" };
    patch.option = a.option;
  }
  if (a.qty !== undefined) {
    const n = Number(a.qty);
    if (!Number.isFinite(n) || n <= 0)
      return { ok: false, error: "qty must be positive" };
    patch.qty = n;
  }
  if (a.strike !== undefined) {
    const n = Number(a.strike);
    if (!Number.isFinite(n) || n <= 0)
      return { ok: false, error: "strike must be positive" };
    patch.strike = n;
  }
  if (a.contractPrice !== undefined) {
    const n = Number(a.contractPrice);
    if (!Number.isFinite(n) || n <= 0)
      return { ok: false, error: "contractPrice must be positive" };
    patch.contractPrice = n;
  }
  if (a.dateBought !== undefined) {
    const d = parseDateOnly(a.dateBought);
    if (!d) return { ok: false, error: "Invalid dateBought" };
    patch.dateBought = d;
  }
  if (a.expiryDate !== undefined) {
    const d = parseDateOnly(a.expiryDate);
    if (!d) return { ok: false, error: "Invalid expiryDate" };
    patch.expiryDate = d;
  }
  if (a.status !== undefined) {
    if (!["OPEN", "WIN", "LOSS"].includes(a.status))
      return { ok: false, error: "status must be OPEN, WIN, or LOSS" };
    patch.status = a.status;
  }
  if (a.closingContractPrice !== undefined) {
    const n = Number(a.closingContractPrice);
    if (!Number.isFinite(n) || n < 0)
      return { ok: false, error: "closingContractPrice must be ≥ 0" };
    patch.closingContractPrice = n;
  }
  if (a.dateClosed !== undefined) {
    if (a.dateClosed === "" || a.dateClosed === null) {
      patch.dateClosed = null;
    } else {
      const d = parseDateOnly(a.dateClosed);
      if (!d) return { ok: false, error: "Invalid dateClosed" };
      patch.dateClosed = d;
    }
  }
  if (a.profitLoss !== undefined) {
    const n = Number(a.profitLoss);
    if (!Number.isFinite(n))
      return { ok: false, error: "profitLoss must be a number" };
    patch.profitLoss = n;
  }
  if (a.fees !== undefined) {
    const n = Number(a.fees);
    if (!Number.isFinite(n) || n < 0)
      return { ok: false, error: "fees must be ≥ 0" };
    patch.fees = n;
  }
  if (a.strategy !== undefined)
    patch.strategy = String(a.strategy).trim() || undefined;
  if (a.notes !== undefined) patch.notes = String(a.notes);
  if (a.favourite !== undefined) patch.favourite = !!a.favourite;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No fields to update" };
  }

  try {
    const updated = await Trade.findByIdAndUpdate(existing._id, patch, {
      new: true,
    });
    return {
      ok: true,
      trade: {
        id: updated?._id?.toString(),
        symbol: updated?.symbol,
        option: updated?.option,
        status: updated?.status,
        qty: updated?.qty,
        strike: updated?.strike,
        contractPrice: updated?.contractPrice,
        closingContractPrice: updated?.closingContractPrice,
        dateBought: updated?.dateBought?.toISOString().slice(0, 10),
        dateClosed: updated?.dateClosed
          ? updated.dateClosed.toISOString().slice(0, 10)
          : null,
        expiryDate: updated?.expiryDate?.toISOString().slice(0, 10),
        profitLoss: updated?.profitLoss,
        fees: updated?.fees,
        strategy: updated?.strategy,
        notes: updated?.notes,
        favourite: updated?.favourite,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function parseDateOnly(s: string | undefined): Date | null {
  if (!s) return null;
  // Accept YYYY-MM-DD and parse as UTC so the calendar/journal don't
  // shift the date based on the server's local zone.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return isNaN(dt.getTime()) ? null : dt;
}

// ── Helpers ────────────────────────────────────────────────────────────

type LeanTrade = {
  _id: mongoose.Types.ObjectId | string;
  symbol: string;
  option: "CALL" | "PUT";
  status: "OPEN" | "WIN" | "LOSS";
  profitLoss?: number;
  fees?: number;
  contractPrice: number;
  qty: number;
  strike: number;
  dateBought: Date;
  dateClosed?: Date;
  expiryDate: Date;
  closingContractPrice?: number;
  strategy?: string;
  notes?: string;
};

function net(t: LeanTrade): number {
  return (t.profitLoss ?? 0) - (t.fees ?? 0);
}

function buildTradeContext(trades: LeanTrade[]): string {
  if (trades.length === 0) {
    return "The trader has no trades yet.";
  }

  const closed = trades.filter(
    (t) => t.status === "WIN" || t.status === "LOSS",
  );
  const open = trades.filter((t) => t.status === "OPEN");
  const totalNet = closed.reduce((s, t) => s + net(t), 0);
  const wins = closed.filter((t) => t.status === "WIN").length;
  const losses = closed.filter((t) => t.status === "LOSS").length;
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const avgWin = wins
    ? closed.filter((t) => t.status === "WIN").reduce((s, t) => s + net(t), 0) /
      wins
    : 0;
  const avgLoss = losses
    ? closed.filter((t) => t.status === "LOSS").reduce((s, t) => s + net(t), 0) /
      losses
    : 0;

  const byStrategy = groupBy(closed, (t) => t.strategy ?? "Other");
  const bySymbol = groupBy(closed, (t) => t.symbol);

  const fmtMoney = (n: number) =>
    `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
  const dateStr = (d: Date | string | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : "-";

  const strategyRows = Object.entries(byStrategy)
    .map(([k, ts]) => {
      const n = ts.reduce((s, t) => s + net(t), 0);
      const w = ts.filter((t) => t.status === "WIN").length;
      return `  - ${k}: ${ts.length} closed, win ${((w / ts.length) * 100).toFixed(0)}%, net ${fmtMoney(n)}`;
    })
    .join("\n");

  const symbolRows = Object.entries(bySymbol)
    .map(([k, ts]) => {
      const n = ts.reduce((s, t) => s + net(t), 0);
      const w = ts.filter((t) => t.status === "WIN").length;
      return `  - ${k}: ${ts.length} closed, win ${((w / ts.length) * 100).toFixed(0)}%, net ${fmtMoney(n)}`;
    })
    .join("\n");

  // Buckets a closed trade on its exit date; an open trade on its
  // entry date - the same attribution rule the rest of the app uses.
  const bucketDay = (t: LeanTrade) => {
    const isClosed = t.status === "WIN" || t.status === "LOSS";
    const src = isClosed && t.dateClosed ? t.dateClosed : t.dateBought;
    return dateStr(src);
  };

  // ── Per-month and per-week aggregates ───────────────────────────────
  const monthly = new Map<
    string,
    { n: number; wins: number; losses: number; net: number }
  >();
  const weekly = new Map<
    string,
    { n: number; wins: number; losses: number; net: number; weekStart: string }
  >();
  for (const t of closed) {
    const day = bucketDay(t);
    const d = new Date(day + "T00:00:00Z");
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const m = monthly.get(monthKey) ?? { n: 0, wins: 0, losses: 0, net: 0 };
    m.n += 1;
    m.net += net(t);
    if (t.status === "WIN") m.wins += 1;
    else m.losses += 1;
    monthly.set(monthKey, m);

    // ISO-week (Mon-start). Compute via offsetting to nearest Monday.
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - dow);
    const wKey = monday.toISOString().slice(0, 10);
    const w = weekly.get(wKey) ?? {
      n: 0,
      wins: 0,
      losses: 0,
      net: 0,
      weekStart: wKey,
    };
    w.n += 1;
    w.net += net(t);
    if (t.status === "WIN") w.wins += 1;
    else w.losses += 1;
    weekly.set(wKey, w);
  }

  const monthlyRows = Array.from(monthly.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, v]) => {
      const wr = v.n ? ((v.wins / v.n) * 100).toFixed(0) : "-";
      return `  - ${k}: ${v.n} closed (${v.wins}W/${v.losses}L), win ${wr}%, net ${fmtMoney(v.net)}`;
    })
    .join("\n");

  const weeklyRows = Array.from(weekly.values())
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .map((v) => {
      const wr = v.n ? ((v.wins / v.n) * 100).toFixed(0) : "-";
      return `  - week of ${v.weekStart}: ${v.n} closed (${v.wins}W/${v.losses}L), win ${wr}%, net ${fmtMoney(v.net)}`;
    })
    .join("\n");

  // ── Full trade list (compact, one line per trade) ───────────────────
  // Each row leads with [id:…] so edit_trade can target a specific trade
  // without ambiguity. Format:
  //   [id:…] entry → exit | symbol option strike xqty | entry$ → exit$
  //   | status | strategy | net
  const tradeRows = trades
    .map((t) => {
      const isClosed = t.status === "WIN" || t.status === "LOSS";
      const exitDate = isClosed ? dateStr(t.dateClosed) : "-";
      const exitPx = isClosed ? (t.closingContractPrice ?? "-") : "-";
      const netVal = isClosed ? fmtMoney(net(t)) : "OPEN";
      const id = String(t._id);
      return `  - [id:${id}] ${dateStr(t.dateBought)} → ${exitDate} | ${t.symbol} ${t.option} ${t.strike} x${t.qty} | $${t.contractPrice} → $${exitPx} | ${t.status} | ${t.strategy ?? "-"} | ${netVal}`;
    })
    .join("\n");

  return [
    `Snapshot from the most recent ${trades.length} trades (non-simulated):`,
    `- Closed: ${closed.length} (${wins} W / ${losses} L), Win rate ${winRate.toFixed(0)}%`,
    `- Net P/L (all closed in snapshot): ${fmtMoney(totalNet)}`,
    `- Avg winner: ${fmtMoney(avgWin)} · Avg loser: ${fmtMoney(avgLoss)}`,
    `- Currently open: ${open.length}`,
    "",
    "By strategy:",
    strategyRows || "  (none)",
    "",
    "By symbol:",
    symbolRows || "  (none)",
    "",
    "By month (closed trades, newest first):",
    monthlyRows || "  (none)",
    "",
    "By week (closed trades, Mon-start, newest first):",
    weeklyRows || "  (none)",
    "",
    `All ${trades.length} trades (entry → exit | symbol option strike qty | entry$ → exit$ | status | strategy | net):`,
    tradeRows,
  ].join("\n");
}

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

// Inject "today" reference + a calendar lookup for the next 10 days so
// Gemini doesn't have to guess what day "Friday" or "next Monday" is.
function buildDateContext(tz: string): string {
  const now = new Date();
  const userToday = zonedYmd(now, tz);
  const userTodayDow = zonedWeekday(now, tz);
  const nyToday = zonedYmd(now, "America/New_York");
  const nyTodayDow = zonedWeekday(now, "America/New_York");

  const upcoming: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const ymd = zonedYmd(d, tz);
    const dow = zonedWeekday(d, tz);
    const label =
      i === 0
        ? "today"
        : i === 1
          ? "tomorrow"
          : i === 2
            ? "the day after tomorrow"
            : "";
    upcoming.push(
      `  - ${ymd} (${dow}${label ? `, ${label}` : ""})`,
    );
  }

  return [
    `User's timezone: ${tz}`,
    `Today in user's timezone: ${userToday} (${userTodayDow})`,
    `Today in US/Eastern (market time): ${nyToday} (${nyTodayDow})`,
    "Upcoming dates (in the user's timezone):",
    ...upcoming,
  ].join("\n");
}

function zonedYmd(d: Date, tz: string): string {
  // en-CA returns YYYY-MM-DD format from Intl.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function zonedWeekday(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
  }).format(d);
}

const SYSTEM_PROMPT = (
  name: string,
  context: string,
  dateBlock: string,
) => `
You are QuillAI, Cuequill's in-app trading assistant for ${name}, who trades
US options discretionarily on IBKR (mostly SPY, AAPL, AMZN, TSLA, NVDA, QQQ).
If the user asks who you are, you are "QuillAI" - built into the Cuequill
trading journal and powered by Google Gemini.

Your job:
- Answer questions about their trading history, strategies, P/L, win rate,
  streaks, and patterns. The TRADER SNAPSHOT below contains the FULL list
  of their recent trades (up to 1000 entries, newest first), each with
  entry + exit dates, prices, status, strategy, and net P/L - plus
  pre-computed weekly and monthly aggregates. Use it as the source of
  truth. You CAN compare arbitrary weeks, months, or symbols directly
  from this data.

PRESENTING TRADES
When you reference one or more specific trades, render each one as a
trade card by emitting a Markdown link of the form:

  [trade-card](trade://<id>)

on its own line. The chat UI replaces this link with a styled card
that shows the ticker, option (CALL/PUT), status, strike × qty,
entry → exit dates, net P/L, and strategy — all pulled from the
authoritative trade data. You do NOT need to write any of those
details in prose; the card renders them. Just emit the card link,
one per trade you're showing.

The "[id:…]" tag in the snapshot is the source for <id>. The id must
appear ONLY inside a trade:// link's href — NEVER as plain text. The
visible link text MUST be the literal word "trade-card" (the UI
ignores it, but Markdown requires non-empty link text).

Format rules:
- One card per trade. Each on its own line, with a blank line above
  and below each card so they render as separate paragraphs.
- Do NOT wrap the cards in a Markdown list (no leading "-" or "*").
  The cards stand on their own.
- Do NOT write the trade's ticker, option, status, P/L, strike,
  dates, or strategy as prose next to the card — the card already
  shows all of that.
- A short intro sentence BEFORE the cards and a short takeaway sentence
  or two AFTER the cards is welcome when the user asked an analytical
  question. Keep prose minimal between cards.
- When you mention a ticker INLINE in flowing prose (not as a card),
  just write the symbol as plain text. Do not use a trade:// link
  for inline references — those would render as a card mid-sentence.

Example:

Your last 3 NVDA losses:

[trade-card](trade://507f1f77bcf86cd799439011)

[trade-card](trade://507f1f77bcf86cd799439012)

[trade-card](trade://507f1f77bcf86cd799439013)

All three were on First Red Opening Candle — might be worth backing off
that setup until you see two greens in a row.

If you genuinely don't have an id for a trade you're describing (rare),
mention it in plain text and explain that you can't link to it.

STYLE & ANALYSIS
- When the user asks for opinions, be direct and specific. Reference actual
  trades when relevant ("your last 3 NVDA CALLs all lost on Hard Floor - …").
- Surface observations the user might miss: drawdowns, repeated mistakes,
  oversized losses, strategies underperforming.
- Stay concise. Bullet points and short paragraphs over prose walls.
- Never make up trades, P/L, or stats. If the snapshot doesn't show it, say so.
- This is journaling and analysis only - do NOT give personalized investment
  advice, trade recommendations, or predictions.

TOOLS
You have two tools available:

- add_trade(...) - log a NEW open options trade in the user's journal.
  Call this when the user clearly says they took a trade (e.g. "I just
  bought 5 SPY 600 CALLs at $1.20 expiring Friday", "log a trade", "add
  this to my journal"). If the user mentions a trade but ANY required
  field is missing or unclear (symbol, option, qty, strike, entry price,
  entry date, expiry), ASK them in plain English instead of guessing.

- edit_trade(id, ...fields) - update an EXISTING trade. Use this to
  close a trade (set status=WIN/LOSS, plus closingContractPrice,
  dateClosed, and profitLoss), fix a typo (e.g. wrong strike), change
  strategy, add/replace notes, or flag a favourite. The id MUST come
  from the "[id:…]" tag at the start of a trade row in the TRADER
  SNAPSHOT. Only pass the fields you want to change - anything you omit
  stays the same. If multiple trades could match what the user
  described, ASK which one (read out a few candidates with date +
  symbol + qty so they can pick). For status=WIN/LOSS, if the user
  gave a closing price but no P/L, compute net P/L as
  (closingContractPrice - contractPrice) × qty × 100 and pass it as
  profitLoss (this is the contract-multiplier math for US equity
  options).

After either tool returns, briefly confirm what was saved (1-2 sentences).

Dates: ALWAYS use the DATE REFERENCE block below to resolve relative
expressions. "today" = the date listed as today in the user's timezone.
"Friday" / "next Friday" / "this Friday" = the upcoming Friday listed.
Do NOT use your training-time intuition for the current date - use
the reference block. Pass dates in YYYY-MM-DD format. Strike and prices
are in USD.

DATE REFERENCE
---
${dateBlock}
---

TRADER SNAPSHOT
---
${context}
---
`;
