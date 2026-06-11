import { randomUUID } from "crypto";
import connectDb from "@/lib/db";
import RulesBoard from "@/lib/models/RulesBoard";
import { NextRequest, NextResponse } from "next/server";

type RuleInput = { id?: string; title?: unknown; body?: unknown };
type SectionInput = { id?: string; title?: unknown; rules?: unknown };

// The default board seeded for a user on first visit. These are the same
// rules the page used to hardcode - now they belong to the user and can be
// renamed, reordered, moved, or deleted like anything else.
function defaultSections() {
  const make = (title: string, rules: { title: string; body: string }[]) => ({
    id: randomUUID(),
    title,
    rules: rules.map((r) => ({ id: randomUUID(), ...r })),
  });

  return [
    make("Trading windows", [
      {
        title: "Market hours",
        body: "Opens 9:30 AM ET, closes 4:00 PM ET. Weekends are closed.",
      },
      {
        title: "Skip the first 30 minutes",
        body: "Never trade between 9:30 and 10:00 - opening candles are too volatile.",
      },
      {
        title: "Premarket signals sells, not buys",
        body: "Use premarket to flag exits, not entries.",
      },
      {
        title: "PUTs at the open",
        body: "Sell PUTs at 9:30 - price typically opens low and rallies.",
      },
      {
        title: "Last call",
        body: "Last entry is 3:59 PM. Anything after fills at the next 9:30 open.",
      },
      {
        title: "SPY / QQQ extended close",
        body: "These trade until 4:14 PM. Closing bell at 4:15 PM.",
      },
    ]),
    make("Position rules", [
      { title: "Start small", body: "Don't size into a setup you haven't proven." },
      {
        title: "10% per trade",
        body: "Cap each entry at 10% of portfolio. Example: $500 portfolio → $50 per trade.",
      },
      { title: "2–4 trades per week", body: "More than that is noise, not edge." },
      {
        title: "Respect the timeframes",
        body: "If the rule window says no, the answer is no.",
      },
      {
        title: "Only buy fulfilled candles",
        body: "Wait for the candle to close. Never act on a live wick.",
      },
      {
        title: "Do not exit on a loss",
        body: "Let the plan run, not your emotions.",
      },
      {
        title: "No Fed days",
        body: "Sit out FOMC and meeting dates - direction is unpredictable.",
      },
    ]),
  ];
}

// Normalise whatever the client sends into the stored shape, dropping
// anything malformed so a bad payload can't corrupt the board.
function sanitize(sections: unknown) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((s: SectionInput) => ({
      id: typeof s?.id === "string" && s.id ? s.id : randomUUID(),
      title: String(s?.title ?? "").trim() || "Untitled section",
      rules: Array.isArray(s?.rules)
        ? (s.rules as RuleInput[])
            .filter((r) => String(r?.title ?? "").trim())
            .map((r) => ({
              id: typeof r?.id === "string" && r.id ? r.id : randomUUID(),
              title: String(r.title).trim(),
              body: String(r?.body ?? "").trim(),
            }))
        : [],
    }))
    .filter((s) => s.title || s.rules.length);
}

// Get the user's board, seeding the defaults on first visit.
export async function GET(req: NextRequest) {
  await connectDb();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    let board = await RulesBoard.findOne({ userId });
    if (!board) {
      board = await RulesBoard.create({
        userId,
        sections: defaultSections(),
      });
    }
    return NextResponse.json({ sections: board.sections });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch rules";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Replace the whole board (used for every add/edit/move/reorder).
export async function PUT(req: NextRequest) {
  await connectDb();

  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const sections = sanitize(body.sections);
    const board = await RulesBoard.findOneAndUpdate(
      { userId },
      { sections },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ sections: board.sections });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save rules";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
