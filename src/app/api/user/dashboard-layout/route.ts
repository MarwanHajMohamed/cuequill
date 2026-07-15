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
//
//   GET → { layout: string[] | null, glanceTiles: string[] | null }
//         (null = never customised → client uses its default)
//   PUT { layout?: string[], glanceTiles?: string[] } → persists whichever
//         key(s) are present, returns the current values.
//
// Arrays are stored verbatim; the client sanitises each against its
// registry on read, so an unknown/removed id can never break the render.
// We cap the length as a cheap guard against a bloated document.

const MAX_IDS = 50;

function isIdArray(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.every((x) => typeof x === "string") &&
    v.length <= MAX_IDS
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "dashboardLayout dashboardGlanceTiles",
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    layout: user.dashboardLayout ?? null,
    glanceTiles: user.dashboardGlanceTiles ?? null,
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

  const { layout, glanceTiles } = (body ?? {}) as {
    layout?: unknown;
    glanceTiles?: unknown;
  };

  const update: {
    dashboardLayout?: string[];
    dashboardGlanceTiles?: string[];
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

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "provide layout and/or glanceTiles" },
      { status: 400 },
    );
  }

  await connectDb();
  const user = await User.findByIdAndUpdate(session.user.id, update, {
    new: true,
  }).select("dashboardLayout dashboardGlanceTiles");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    layout: user.dashboardLayout ?? null,
    glanceTiles: user.dashboardGlanceTiles ?? null,
  });
}
