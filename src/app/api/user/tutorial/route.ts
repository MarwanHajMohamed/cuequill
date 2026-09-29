import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

// First-run coach-mark tours. GET returns the user's tour state; POST
// marks a page as seen (or resets / enables the whole tour).
//
// The `seen` field returned by GET:
//   - null   → tutorials are not enabled for this user (legacy account
//              that never opted in); the client shouldn't auto-start.
//   - []     → new user; every page's tour will run on first visit.
//   - [ids]  → tours for the listed pageIds are done.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();
  const u = await User.findById(session.user.id)
    .select("tutorialsSeen")
    .lean<{ tutorialsSeen?: string[] }>();
  return NextResponse.json({ seen: u?.tutorialsSeen ?? null });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    pageId?: string;
    seen?: boolean;
    reset?: boolean;
    enable?: boolean;
  };
  await connectDb();

  // Explicit opt-in / re-run: wipe the seen list so every tour fires
  // again from the next page visit. Used by the "Show me around" flow
  // for legacy accounts that never had the field.
  if (body.enable === true || body.reset === true) {
    await User.findByIdAndUpdate(session.user.id, {
      $set: { tutorialsSeen: [] },
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.pageId === "string" && body.seen === true) {
    await User.findByIdAndUpdate(session.user.id, {
      $addToSet: { tutorialsSeen: body.pageId },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
