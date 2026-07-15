import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-account dashboard layout: the ordered list of enabled widget ids
// for the customisable dashboard grid.
//
//   GET → { layout: string[] | null }  (null = never customised)
//   PUT { layout: string[] } → persists the layout, returns { layout }
//
// The array is stored verbatim; the client sanitises it against the
// widget registry on read, so an unknown/removed id can never break the
// render. We cap the length as a cheap guard against a bloated document.

const MAX_WIDGETS = 50;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select("dashboardLayout");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ layout: user.dashboardLayout ?? null });
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

  const layout = (body as { layout?: unknown })?.layout;
  if (
    !Array.isArray(layout) ||
    layout.some((x) => typeof x !== "string") ||
    layout.length > MAX_WIDGETS
  ) {
    return NextResponse.json(
      { error: "layout must be an array of widget ids" },
      { status: 400 },
    );
  }

  await connectDb();
  const user = await User.findByIdAndUpdate(
    session.user.id,
    { dashboardLayout: layout as string[] },
    { new: true },
  ).select("dashboardLayout");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ layout: user.dashboardLayout ?? null });
}
