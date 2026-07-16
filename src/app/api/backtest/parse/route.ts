import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
  type FunctionDeclaration,
  type Schema,
} from "@google/generative-ai";
import {
  DAILY_MESSAGE_LIMIT,
  MONTHLY_TOKEN_LIMIT,
  dayKey,
  monthKey,
} from "@/lib/chatLimits";
import { sanitizeConfig } from "@/lib/backtest/sanitize";
import { PATTERN_META } from "@/lib/backtest/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/backtest/parse
// Body: { text: string }
// Turns a plain-English strategy description into a structured
// BacktestConfig using Gemini function-calling. The config is sanitised
// server-side before it's returned, so the client always gets something
// the engine can run (or a clear error if the model produced nothing
// usable). The user still reviews/edits it before running.

// Human-readable menu of the pattern kinds the engine understands, so the
// model maps free text onto the exact enum values instead of inventing new
// ones. Kept in sync automatically with PATTERN_META.
const PATTERN_MENU = (Object.keys(PATTERN_META) as (keyof typeof PATTERN_META)[])
  .map((k) => `  - "${k}": ${PATTERN_META[k].label}`)
  .join("\n");

const TODAY = new Date().toISOString().slice(0, 10);

const SYSTEM_PROMPT = `
You translate a trader's plain-English description of a rule-based stock/ETF
strategy into a structured backtest configuration by calling build_backtest.
ALWAYS call build_backtest exactly once. Never reply with prose.

The strategy runs on DAILY bars of a single US stock or ETF. Signals are
evaluated on a bar's close.

Guidance:
- symbol: infer the ticker the user names (e.g. "Apple" -> AAPL, "the S&P" ->
  SPY, "Nasdaq" -> QQQ). Default to SPY if none is given.
- direction: "long" to buy/go long, "short" to short/bet on a fall.
- entry conditions ALL must be true on the same bar to open a trade.
- exit conditions: ANY true closes the trade (on top of stop/target/time).
- Each condition is either:
  * a candle/price-action PATTERN -> { "type": "pattern", "pattern": <kind>, "n": <number if the pattern uses one> }
  * an INDICATOR comparison -> { "type": "compare", "left": <indicator>, "op": <comparator>, "right": <indicator> }
- An indicator is one of:
  * { "kind": "price", "field": "open"|"high"|"low"|"close" }
  * { "kind": "sma", "period": N }   (simple moving average)
  * { "kind": "ema", "period": N }   (exponential moving average)
  * { "kind": "rsi", "period": N }   (default period 14)
  * { "kind": "value", "value": X }  (a constant, e.g. RSI < 30)
- Comparators: "crossesAbove", "crossesBelow", "greaterThan", "lessThan".
- Pattern kinds you may use (choose the closest match, never invent one):
${PATTERN_MENU}
- "first red candle" / "first red after some green" -> pattern "firstRedAfterGreen"
  (n = how many green bars must precede it; default 3).
- Use stopLossPct / takeProfitPct / maxBars when the user mentions a stop, a
  target, or a time-based exit. Otherwise leave them null.
- If the user gives no dates, use from ${new Date(new Date().getFullYear() - 10, 0, 1)
  .toISOString()
  .slice(0, 10)} to ${TODAY}.
- Default initialCapital 10000 and positionPct 100 unless the user says otherwise.

Today's date is ${TODAY}.
`;

const cond: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["compare", "pattern"],
      description: "'pattern' for a candle/price-action rule, else 'compare'.",
    },
    pattern: {
      type: SchemaType.STRING,
      description: "For type=pattern: one of the allowed pattern kinds.",
    },
    n: {
      type: SchemaType.NUMBER,
      description:
        "For patterns that use a count/lookback (e.g. green bars before a first red, or the N-day high/low window).",
    },
    left: {
      type: SchemaType.OBJECT,
      description: "For type=compare: the left-hand indicator.",
      properties: {
        kind: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["price", "sma", "ema", "rsi", "value"],
        },
        field: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["open", "high", "low", "close"],
        },
        period: { type: SchemaType.NUMBER },
        value: { type: SchemaType.NUMBER },
      },
    },
    op: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["crossesAbove", "crossesBelow", "greaterThan", "lessThan"],
      description: "For type=compare: the comparator.",
    },
    right: {
      type: SchemaType.OBJECT,
      description: "For type=compare: the right-hand indicator.",
      properties: {
        kind: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["price", "sma", "ema", "rsi", "value"],
        },
        field: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["open", "high", "low", "close"],
        },
        period: { type: SchemaType.NUMBER },
        value: { type: SchemaType.NUMBER },
      },
    },
  },
  required: ["type"],
};

const BUILD_BACKTEST_TOOL: FunctionDeclaration = {
  name: "build_backtest",
  description:
    "Return the structured backtest configuration for the strategy the user described.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: { type: SchemaType.STRING, description: "US ticker, uppercase." },
      direction: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["long", "short"],
      },
      from: { type: SchemaType.STRING, description: "Start date YYYY-MM-DD." },
      to: { type: SchemaType.STRING, description: "End date YYYY-MM-DD." },
      initialCapital: { type: SchemaType.NUMBER },
      positionPct: {
        type: SchemaType.NUMBER,
        description: "Percent of equity per trade (1-100).",
      },
      stopLossPct: {
        type: SchemaType.NUMBER,
        description: "Stop loss percent, or omit if none.",
      },
      takeProfitPct: {
        type: SchemaType.NUMBER,
        description: "Take profit percent, or omit if none.",
      },
      maxBars: {
        type: SchemaType.NUMBER,
        description: "Time stop: exit after this many bars, or omit.",
      },
      entry: { type: SchemaType.ARRAY, items: cond },
      exit: { type: SchemaType.ARRAY, items: cond },
    },
    required: ["symbol", "direction", "entry", "exit"],
  },
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDb();
  const u = await User.findById(session.user.id)
    .select("isPro chatDailyDate chatDailyCount chatMonth chatMonthTokens")
    .lean<{
      isPro?: boolean;
      chatDailyDate?: string;
      chatDailyCount?: number;
      chatMonth?: string;
      chatMonthTokens?: number;
    }>();
  if (!u?.isPro) {
    return new Response("Pro membership required", { status: 403 });
  }

  // Share Quill AI's fair-use budget — same shared Gemini key.
  const today = dayKey();
  const month = monthKey();
  const usedToday = u.chatDailyDate === today ? u.chatDailyCount ?? 0 : 0;
  const usedMonthTokens =
    u.chatMonth === month ? u.chatMonthTokens ?? 0 : 0;
  if (usedToday >= DAILY_MESSAGE_LIMIT) {
    return new Response(
      `You've reached today's AI limit of ${DAILY_MESSAGE_LIMIT} requests. It resets at midnight UTC.`,
      { status: 429 },
    );
  }
  if (usedMonthTokens >= MONTHLY_TOKEN_LIMIT) {
    return new Response(
      "You've reached this month's AI usage limit. It resets next month.",
      { status: 429 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return new Response("GEMINI_API_KEY not set", { status: 500 });

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const text = (body.text ?? "").toString().trim();
  if (!text) return new Response("Describe your strategy first", { status: 400 });
  if (text.length > 2000) {
    return new Response("Description is too long (max 2000 chars).", {
      status: 400,
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: [BUILD_BACKTEST_TOOL] }],
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingMode.ANY,
        allowedFunctionNames: ["build_backtest"],
      },
    },
  });

  let tokens = 0;
  try {
    const result = await model.generateContent(text);
    tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
    const call = result.response.functionCalls()?.[0];
    if (!call || call.name !== "build_backtest") {
      return new Response(
        JSON.stringify({
          error:
            "Couldn't turn that into a strategy. Try describing the entry and exit rules more concretely (e.g. \"buy the first red candle after 3 green ones, sell on the next green candle with a 3% stop\").",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }
    const config = sanitizeConfig(call.args as Record<string, unknown>);
    if (config.entry.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "I couldn't work out a clear entry rule from that. Say what should trigger a buy (or short) — e.g. a candle pattern, a moving-average cross, or an RSI level.",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ config }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    try {
      await User.findByIdAndUpdate(session.user.id, {
        $set: {
          chatDailyDate: today,
          chatDailyCount: usedToday + 1,
          chatMonth: month,
          chatMonthTokens: usedMonthTokens + tokens,
        },
      });
    } catch {
      /* usage accounting is best-effort */
    }
  }
}
