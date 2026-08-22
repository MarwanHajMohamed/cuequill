import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import Trade from "@/lib/models/Trade";
import { User } from "@/lib/models/User";
import Goal from "@/lib/models/Goal";
import RulesBoard from "@/lib/models/RulesBoard";
import Strategy from "@/lib/models/Strategy";
import {
  buildTradeContext,
  buildRulesContext,
  buildStrategiesContext,
  buildGoalsContext,
  buildDateContext,
  computeQueryStats,
  type LeanTrade,
  type LeanRulesBoard,
  type LeanStrategy,
  type LeanGoal,
  type QueryStatsFilter,
} from "@/lib/quillContext";
import { getQuillModel } from "@/lib/quillCache";
import mongoose from "mongoose";
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionCall,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import {
  DAILY_MESSAGE_LIMIT,
  MONTHLY_TOKEN_LIMIT,
  dayKey,
  monthKey,
} from "@/lib/chatLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/chat
// Body: { messages: [{ role, text, images? }, ...] }
// The last message may carry image data URLs (screenshots the user
// attached — e.g. a broker fill to log). Streams Gemini's response as
// text/plain chunks (the client just appends them).
//
// Free-tier setup:
//   1. Get a key from https://aistudio.google.com/apikey
//   2. Set GEMINI_API_KEY in env
//   3. Model defaults to gemini-2.5-flash (generous free quota)

type IncomingMsg = { role: "user" | "model"; text: string; images?: string[] };

// Guardrails for attached images: a handful of screenshots per turn,
// each within Gemini's inline-data comfort zone.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5MB decoded per image

// Turns a data URL ("data:image/png;base64,....") into a Gemini inlineData
// part. Returns null for anything that isn't a supported inline image or is
// too large, so a malformed attachment is skipped rather than crashing the
// request.
function dataUrlToPart(url: string): Part | null {
  const m = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(
    url.trim(),
  );
  if (!m) return null;
  const [, mimeType, data] = m;
  // base64 length → decoded bytes (~3/4), rough but fine as a size gate.
  if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) return null;
  return { inlineData: { mimeType, data } };
}

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
    .select(
      "isPro chatDailyDate chatDailyCount chatMonth chatMonthTokens bonusChatMessages",
    )
    .lean<{
      isPro?: boolean;
      chatDailyDate?: string;
      chatDailyCount?: number;
      chatMonth?: string;
      chatMonthTokens?: number;
      bonusChatMessages?: number;
    }>();
  if (!proCheck?.isPro) {
    return new Response("Pro membership required", { status: 403 });
  }

  // ── Per-user fair-use limits ────────────────────────────────────────
  // Counters reset lazily: if the stored day/month key differs from the
  // current one, treat the used amount as 0.
  const today = dayKey();
  const month = monthKey();
  const usedToday = proCheck.chatDailyDate === today ? proCheck.chatDailyCount ?? 0 : 0;
  const usedMonthTokens =
    proCheck.chatMonth === month ? proCheck.chatMonthTokens ?? 0 : 0;
  const bonusMessages = proCheck.bonusChatMessages ?? 0;
  // Over the daily cap? Fall back to the bonus pool earned from challenges.
  const overDailyLimit = usedToday >= DAILY_MESSAGE_LIMIT;
  if (overDailyLimit && bonusMessages <= 0) {
    return new Response(
      `You've reached today's Quill AI limit of ${DAILY_MESSAGE_LIMIT} messages. It resets at midnight UTC. Check back then.`,
      { status: 429 },
    );
  }
  if (usedMonthTokens >= MONTHLY_TOKEN_LIMIT) {
    return new Response(
      "You've reached this month's Quill AI usage limit. It resets at the start of next month.",
      { status: 429 },
    );
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

  // ── Load trades + planning context for this user ────────────────────
  const userId = new mongoose.Types.ObjectId(session.user.id);
  // Pull a wide history. Gemini 2.5 Flash has a 1M-token context window;
  // 1000 compact trade rows is ~80KB - trivial to ship. Rules, strategies
  // and goals are small; load them alongside so Quill can check discipline
  // and track progress.
  const [trades, rulesBoard, strategies, goals] = await Promise.all([
    Trade.find({ userID: userId, simulated: false })
      .sort({ dateBought: -1 })
      .limit(1000)
      .lean() as unknown as Promise<LeanTrade[]>,
    RulesBoard.findOne({ userId }).lean() as Promise<LeanRulesBoard | null>,
    Strategy.find({ userId })
      .select("name direction timeframes description tags")
      .lean() as unknown as Promise<LeanStrategy[]>,
    Goal.find({ userId }).sort({ order: 1 }).lean() as unknown as Promise<
      LeanGoal[]
    >,
  ]);

  const context = [
    buildTradeContext(trades),
    buildRulesContext(rulesBoard),
    buildStrategiesContext(strategies, trades),
    buildGoalsContext(goals, trades),
  ]
    .filter(Boolean)
    .join("\n\n");

  // Build a today-reference block so Gemini can resolve relative dates
  // like "today", "Friday", "next Monday" correctly. LLMs don't know the
  // current date on their own.
  const userTz = session.user.timezone || "America/New_York";
  const dateBlock = buildDateContext(userTz);

  // Valid trade ids for this user — used to strip any trade:// card the model
  // emits for an id that isn't actually in the snapshot (hallucination guard).
  const validTradeIds = new Set(trades.map((t) => String(t._id)));

  // ── Build Gemini request ────────────────────────────────────────────
  const genAI = new GoogleGenerativeAI(apiKey);
  const TOOLS = [
    ADD_TRADE_TOOL,
    EDIT_TRADE_TOOL,
    DELETE_TRADE_TOOL,
    QUERY_STATS_TOOL,
  ];
  const systemInstruction = SYSTEM_PROMPT(
    session.user.firstname ?? "trader",
    context,
    dateBlock,
  );
  // Reuses (or creates) a Gemini context cache for the big, stable system
  // instruction so multi-turn chats don't re-bill it each message. Falls back
  // to an uncached model automatically on any caching problem.
  const model = await getQuillModel({
    genAI,
    apiKey,
    userId: session.user.id,
    systemInstruction,
    tools: TOOLS,
  });

  // Convert our message history into Gemini's format. The last message
  // is the new prompt; earlier ones become chat history (text only —
  // attached images aren't persisted, so history stays lightweight).
  const last = messages[messages.length - 1];
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  // The current turn may carry attached images (data URLs). Build a parts
  // array: the text first, then each valid image as inlineData.
  const lastParts: Part[] = [];
  if (last.text) lastParts.push({ text: last.text });
  const imageParts = (last.images ?? [])
    .slice(0, MAX_IMAGES)
    .map(dataUrlToPart)
    .filter((p): p is Part => p !== null);
  lastParts.push(...imageParts);
  if (lastParts.length === 0) lastParts.push({ text: "" });

  // Tools live on the model (or its context cache), so they don't need to be
  // repeated here.
  const chat = model.startChat({ history });

  // ── Stream the response back ────────────────────────────────────────
  // Sentinel emitted at the end of any response that touched the trades
  // collection - the client uses it to invalidate its react-query cache.
  // A null byte won't appear in Gemini's natural-language output.
  const REFRESH_SENTINEL = "[[CUEQUILL_REFRESH_TRADES]]";
  const encoder = new TextEncoder();
  // Drop any trade card the model emits for an id not in the snapshot, so a
  // hallucinated id never renders as a broken card. Cards look like
  // "[trade-card](trade://<id>)".
  const CARD_RE = /\[[^\]]*\]\(trade:\/\/([^)]+)\)/g;
  const sanitizeCards = (s: string): string =>
    s.replace(CARD_RE, (full, id: string) =>
      validTradeIds.has(id.trim()) ? full : "",
    );

  const stream = new ReadableStream({
    async start(controller) {
      // Stream text through a small buffer so a card link is never split
      // across chunks when we sanitise it: we hold back only from an open
      // "[" that hasn't closed with ")" yet, so normal prose still streams
      // token-by-token.
      let buf = "";
      const flush = (final: boolean) => {
        if (final) {
          if (buf) controller.enqueue(encoder.encode(sanitizeCards(buf)));
          buf = "";
          return;
        }
        const open = buf.lastIndexOf("[");
        const safeUpto =
          open === -1
            ? buf.length
            : buf.indexOf(")", open) === -1
              ? open
              : buf.length;
        if (safeUpto > 0) {
          controller.enqueue(encoder.encode(sanitizeCards(buf.slice(0, safeUpto))));
          buf = buf.slice(safeUpto);
        }
      };

      const drainStream = async (
        result: Awaited<ReturnType<typeof chat.sendMessageStream>>,
      ): Promise<FunctionCall[]> => {
        const collected: FunctionCall[] = [];
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            buf += text;
            flush(false);
          }
          const fc = chunk.functionCalls();
          if (fc && fc.length) collected.push(...fc);
        }
        flush(true);
        return collected;
      };

      // Sum Gemini's reported token usage across every generation in this
      // turn (the initial reply plus any tool-call follow-ups) so it can
      // be billed against the user's monthly budget.
      let totalTokens = 0;
      const addUsage = async (
        r: Awaited<ReturnType<typeof chat.sendMessageStream>>,
      ) => {
        try {
          const resp = await r.response;
          totalTokens += resp.usageMetadata?.totalTokenCount ?? 0;
        } catch {
          /* usage is best-effort */
        }
      };

      try {
        let touchedTrades = false;
        let result = await chat.sendMessageStream(lastParts);
        let calls = await drainStream(result);
        await addUsage(result);

        // Loop in case Gemini chains tool calls. Bounded so a hallucinating
        // model can't spin us forever, but generous enough for a bulk
        // action (e.g. tagging several trades) that fans out into many
        // edit_trade / delete_trade calls across a few rounds.
        for (let i = 0; i < 8 && calls.length > 0; i++) {
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
            } else if (call.name === "delete_trade") {
              const res = await executeDeleteTrade(
                session.user.id,
                call.args as Record<string, unknown>,
              );
              if (res.ok) touchedTrades = true;
              fnResponses.push({
                functionResponse: { name: call.name, response: res },
              });
            } else if (call.name === "query_stats") {
              // Read-only: exact aggregates over the in-scope trades. No DB
              // write, so it never sets touchedTrades.
              const res = computeQueryStats(
                trades,
                (call.args ?? {}) as QueryStatsFilter,
              );
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
          await addUsage(result);
        }

        if (touchedTrades) {
          controller.enqueue(encoder.encode(REFRESH_SENTINEL));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
      } finally {
        controller.close();
        // Record usage for this turn (best-effort). The user consumed a
        // message either way, so count it even if generation errored.
        try {
          await User.findByIdAndUpdate(session.user.id, {
            $set: {
              chatDailyDate: today,
              chatDailyCount: usedToday + 1,
              chatMonth: month,
              chatMonthTokens: usedMonthTokens + totalTokens,
            },
            // This turn ran on the bonus pool — spend one.
            ...(overDailyLimit ? { $inc: { bonusChatMessages: -1 } } : {}),
          });
        } catch {
          /* usage accounting is best-effort */
        }
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
      addTags: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description:
          "Tags to ADD to the trade (appended to any it already has, deduped). Use this for tagging — e.g. add 'A+ Setup'. Preferred over `tags` because it won't wipe existing tags.",
      },
      removeTags: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Tags to REMOVE from the trade (case-insensitive).",
      },
      tags: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description:
          "REPLACE the trade's entire tag list with exactly these tags. Only use when the user explicitly wants to overwrite all tags; otherwise use addTags/removeTags.",
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
  addTags?: string[];
  removeTags?: string[];
  tags?: string[];
  favourite?: boolean;
};

// Tag guardrails: keep the list tidy so a bulk tagging run can't bloat a
// document. Free text, deduped case-insensitively (first spelling wins).
const MAX_TAGS = 30;
const MAX_TAG_LEN = 40;
function normalizeTags(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const s = raw.trim().slice(0, MAX_TAG_LEN);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

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

  // Tags: `tags` replaces the whole list; otherwise addTags/removeTags mutate
  // the existing set. Add/remove is the common path (e.g. tag a batch of
  // trades) and won't clobber tags the user already applied.
  if (a.tags !== undefined) {
    patch.tags = normalizeTags(a.tags);
  } else if (a.addTags !== undefined || a.removeTags !== undefined) {
    const current: string[] = Array.isArray(existing.tags)
      ? existing.tags
      : [];
    const remove = new Set(
      normalizeTags(a.removeTags).map((t) => t.toLowerCase()),
    );
    const merged = normalizeTags([
      ...current.filter((t) => !remove.has(t.toLowerCase())),
      ...normalizeTags(a.addTags),
    ]);
    patch.tags = merged;
  }

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
        tags: updated?.tags,
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

// ── Tool: delete_trade ─────────────────────────────────────────────────

const DELETE_TRADE_TOOL: FunctionDeclaration = {
  name: "delete_trade",
  description:
    "Permanently delete a trade from the user's journal. Use ONLY when the user clearly asks to delete/remove a trade (e.g. a duplicate or a mistaken entry). The id MUST come from the [id:…] tag in the TRADER SNAPSHOT. This cannot be undone, so if there's any ambiguity about which trade, ASK the user to confirm first (read out date + symbol + qty). For a bulk delete, call this once per trade.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      id: {
        type: SchemaType.STRING,
        description:
          "The 24-char Mongo ObjectId of the trade to delete — copy it from the [id:…] tag in the TRADER SNAPSHOT.",
      },
    },
    required: ["id"],
  },
};

// ── Tool: query_stats (read-only) ──────────────────────────────────────

const QUERY_STATS_TOOL: FunctionDeclaration = {
  name: "query_stats",
  description:
    "Compute EXACT performance stats for a slice of the user's trades (win rate, net P/L, expectancy, profit factor, payoff, avg win/loss, best/worst, max drawdown). ALWAYS prefer this over counting or adding up rows yourself when the user asks for a specific number — e.g. 'win rate on NVDA', 'net P/L in July', 'how do my Monday trades do'. All filters are optional and combined with AND. Omit a filter to include everything on that dimension. Returns numbers you can quote directly.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: {
        type: SchemaType.STRING,
        description: "Ticker to filter to, uppercase (e.g. NVDA). Omit for all.",
      },
      strategy: {
        type: SchemaType.STRING,
        description:
          "Exact strategy name to filter to (as shown in the snapshot). Omit for all.",
      },
      tag: {
        type: SchemaType.STRING,
        description: "A single tag to filter to. Omit for all.",
      },
      option: {
        type: SchemaType.STRING,
        description: "CALL or PUT. Omit for both.",
        enum: ["CALL", "PUT"],
        format: "enum",
      },
      status: {
        type: SchemaType.STRING,
        description: "WIN, LOSS, or OPEN. Omit for all statuses.",
        enum: ["WIN", "LOSS", "OPEN"],
        format: "enum",
      },
      startDate: {
        type: SchemaType.STRING,
        description:
          "Inclusive start date YYYY-MM-DD. Matches a trade's exit day (or entry day if still open).",
      },
      endDate: {
        type: SchemaType.STRING,
        description: "Inclusive end date YYYY-MM-DD.",
      },
      weekday: {
        type: SchemaType.STRING,
        description:
          "Entry weekday name to filter to, e.g. 'Monday'. Omit for all days.",
      },
    },
    required: [],
  },
};

async function executeDeleteTrade(
  userId: string,
  rawArgs: Record<string, unknown>,
): Promise<
  { ok: true; deleted: Record<string, unknown> } | { ok: false; error: string }
> {
  const id = (rawArgs.id ?? "").toString().trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false, error: "Invalid or missing trade id" };
  }
  try {
    await connectDb();
    const deleted = await Trade.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userID: new mongoose.Types.ObjectId(userId),
    });
    if (!deleted) return { ok: false, error: "Trade not found (or not yours)" };
    return {
      ok: true,
      deleted: {
        id,
        symbol: deleted.symbol,
        option: deleted.option,
        qty: deleted.qty,
        strike: deleted.strike,
        dateBought: deleted.dateBought?.toISOString().slice(0, 10),
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
- Hold them to their own plan. The snapshot may also include their written
  TRADING RULES, their documented STRATEGIES, and their GOALS. When it's
  relevant, check trades against their rules ("this one broke your 'no
  trades after two losses' rule"), reference strategies by their real name,
  and tell them where they stand against a goal. Don't invent rules, goals,
  or strategies that aren't listed.

WEEKLY / PERIODIC REVIEW
If the user asks for a review of their week/month (or says "review my
week"), give a short, structured debrief: headline P/L and record for the
period, what went well, the biggest mistake or leak you can see in the
data, any rule they broke, and where they stand on their goals. Finish with
one concrete thing to focus on next. Keep it tight and specific — cite real
trades (as cards) where useful.

SCREENSHOTS & IMAGES
The user may attach an image (e.g. a broker fill confirmation or a screenshot
of a trade). Read it and act on it: if it clearly shows a trade they took,
offer to log it (or log it with add_trade once you have the required
fields), and ask for anything the image doesn't show. If it's a chart or
P/L screenshot, describe what you see and tie it back to their journal. Never
invent numbers the image doesn't actually contain.

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
- The KEY METRICS block and any query_stats result are pre-computed and exact —
  quote them as-is. Don't re-derive expectancy, profit factor, win rate, etc.
  by hand from the row list; use those numbers or call query_stats.
- This is journaling and analysis only - do NOT give personalized investment
  advice, trade recommendations, or predictions.

TAGS & GROUP-LEVEL REQUESTS
Every trade row ends with "tags:…" showing the labels currently on that
trade ("-" means none). You CAN tag and untag trades — use edit_trade with
addTags / removeTags.

Win rate, expectancy, profit factor, payoff, drawdown, etc. are GROUP
metrics: they describe a SET of trades (a strategy, a symbol, a tag, a
weekday, a date range), never a single trade. One closed trade on its own
is simply a win or a loss — it has no "win rate". So when a request phrases
a per-trade action in terms of a group metric, translate it into "find the
qualifying GROUPS, then act on every trade in them". Do NOT refuse it and
do NOT ask the user for trade ids — you already have every id in the
snapshot.

Example — "tag every trade with a 90%+ win rate as 'A+ Setup'":
  1. Decide the grouping. Default to STRATEGY (the usual meaning of a
     "setup"). If it's genuinely unclear whether they mean by strategy,
     symbol, or an existing tag, ask one short clarifying question first.
  2. Find the groups that meet the threshold. The snapshot's per-strategy
     and per-tag breakdowns already list each group's win rate; read the
     qualifying ones from there, or call query_stats per candidate group
     to be exact.
  3. For EVERY trade belonging to a qualifying group, call edit_trade with
     addTags:["A+ Setup"]. Use the ids from the snapshot; make one
     edit_trade call per trade (they can run in the same round).
  4. Confirm a brief summary: which groups qualified and how many trades
     you tagged.

TOOLS
You have four tools available:

- query_stats(...) - compute EXACT stats for any slice of the journal (by
  symbol, strategy, tag, option, status, date range, or weekday). ALWAYS use
  this when the user asks for a specific number ("what's my win rate on NVDA",
  "net P/L in July", "how do Mondays do") instead of counting or summing the
  rows yourself — your mental arithmetic over the row list is error-prone, the
  tool is exact. It's read-only and instant; call it freely, even several times
  to compare slices. Quote the numbers it returns directly.

- add_trade(...) - log a NEW open options trade in the user's journal.
  Call this when the user clearly says they took a trade (e.g. "I just
  bought 5 SPY 600 CALLs at $1.20 expiring Friday", "log a trade", "add
  this to my journal"), including when the details come from an attached
  screenshot. If ANY required field is missing or unclear (symbol, option,
  qty, strike, entry price, entry date, expiry), ASK them in plain English
  instead of guessing.

- delete_trade(id) - permanently remove a trade (a duplicate or a mistaken
  entry). The id MUST come from the "[id:…]" tag in the snapshot. Deletion
  can't be undone: if there's any doubt about which trade they mean, ASK to
  confirm first (read back date + symbol + qty). For a bulk delete, call it
  once per trade.

- For BULK actions ("close all my open SPY trades", "tag every NVDA loss as
  revenge"), make one edit_trade / delete_trade call per matching trade,
  using the ids from the snapshot. Confirm a brief summary of what changed.

- edit_trade(id, ...fields) - update an EXISTING trade. Use this to
  close a trade (set status=WIN/LOSS, plus closingContractPrice,
  dateClosed, and profitLoss), fix a typo (e.g. wrong strike), change
  strategy, add/replace notes, TAG a trade (addTags / removeTags), or
  flag a favourite. The id MUST come from the "[id:…]" tag at the start
  of a trade row in the TRADER SNAPSHOT. Only pass the fields you want
  to change - anything you omit stays the same. To tag trades, pass
  addTags (e.g. ["A+ Setup"]); this appends without wiping existing
  tags. Use removeTags to untag. Only use the "tags" field (full
  replace) when the user explicitly wants to overwrite every tag. If multiple trades could match what the user
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
