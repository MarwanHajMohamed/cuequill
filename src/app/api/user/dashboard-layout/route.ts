import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-account dashboard customisation:
//   • layout       — ordered enabled widget ids for the widget grid
//   • glanceTiles  — ordered enabled stat-tile ids inside "At a glance"
//   • widgetSizes  — { [widgetId]: 1 | 2 } column span per widget
//   • widgetRows   — { [widgetId]: 1 | 2 } row span per widget
//
//   GET → { layout, glanceTiles, widgetSizes, widgetRows }
//   PUT { layout?, glanceTiles?, widgetSizes?, widgetRows? } → persists
//         whichever key(s) are present, returns the current values.
//
// Values are stored verbatim; the client sanitises each against its
// registry on read, so an unknown/removed id can never break the render.
// We cap sizes for a cheap guard against a bloated document.

const MAX_IDS = 50;

function isIdArray(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.every((x) => typeof x === "string") &&
    v.length <= MAX_IDS
  );
}

// Column spans are 1–2; row spans are 1–3.
function isSpanMap(max: number) {
  return (v: unknown): v is Record<string, number> => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length > MAX_IDS) return false;
    return entries.every(
      ([k, val]) =>
        typeof k === "string" &&
        typeof val === "number" &&
        Number.isInteger(val) &&
        val >= 1 &&
        val <= max,
    );
  };
}
const isSizeMap = isSpanMap(2);
const isRowMap = isSpanMap(3);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "dashboardLayout dashboardGlanceTiles dashboardWidgetSizes",
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    layout: user.dashboardLayout ?? null,
    glanceTiles: user.dashboardGlanceTiles ?? null,
    widgetSizes: user.dashboardWidgetSizes ?? null,
    widgetRows: user.dashboardWidgetRows ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { layout, glanceTiles, widgetSizes, widgetRows } = (body ?? {}) as {
    layout?: unknown;
    glanceTiles?: unknown;
    widgetSizes?: unknown;
    widgetRows?: unknown;
  };

  const update: {
    dashboardLayout?: string[];
    dashboardGlanceTiles?: string[];
    dashboardWidgetSizes?: Record<string, number>;
    dashboardWidgetRows?: Record<string, number>;
  } = {};

  if (layout !== undefined) {
    if (!isIdArray(layout)) {
      return NextResponse.json(
        { error: "layout must be an array of ids" },
        { status: 400 },
      );
    }
    update.dashboardLayout = layout;
  }
  if (glanceTiles !== undefined) {
    if (!isIdArray(glanceTiles)) {
      return NextResponse.json(
        { error: "glanceTiles must be an array of ids" },
        { status: 400 },
      );
    }
    update.dashboardGlanceTiles = glanceTiles;
  }
  if (widgetSizes !== undefined) {
    if (!isSizeMap(widgetSizes)) {
      return NextResponse.json(
        { error: "widgetSizes must be a map of id → 1|2" },
        { status: 400 },
      );
    }
    update.dashboardWidgetSizes = widgetSizes;
  }
  if (widgetRows !== undefined) {
    if (!isRowMap(widgetRows)) {
      return NextResponse.json(
        { error: "widgetRows must be a map of id → 1|2|3" },
        { status: 400 },
      );
    }
    update.dashboardWidgetRows = widgetRows;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "provide layout, glanceTiles, widgetSizes and/or widgetRows" },
      { status: 400 },
    );
  }

  await connectDb();
  const user = await User.findByIdAndUpdate(session.user.id, update, {
    new: true,
  }).select(
    "dashboardLayout dashboardGlanceTiles dashboardWidgetSizes dashboardWidgetRows",
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    layout: user.dashboardLayout ?? null,
    glanceTiles: user.dashboardGlanceTiles ?? null,
    widgetSizes: user.dashboardWidgetSizes ?? null,
    widgetRows: user.dashboardWidgetRows ?? null,
  });
}
