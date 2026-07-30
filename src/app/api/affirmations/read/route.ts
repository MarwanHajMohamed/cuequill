import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import {
  advanceStreak,
  EMPTY_STREAK,
  type AffirmationStreak,
} from "@/lib/affirmationStreak";

export const runtime = "nodejs";

const MAX_TEXTS = 100;

// Persist which affirmations the user has marked read today. Scoped by a
// yyyy-MM-dd `date` string (supplied by the client's local clock, same
// as before) so the state resets daily and syncs across devices.
export async function PUT(req: Request) {
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

  const rawDate = (body as { date?: unknown })?.date;
  const rawTexts = (body as { texts?: unknown })?.texts;

  const date =
    typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : "";
  const texts = Array.isArray(rawTexts)
    ? Array.from(
        new Set(
          rawTexts.filter((t): t is string => typeof t === "string" && !!t),
        ),
      ).slice(0, MAX_TEXTS)
    : [];

  const affirmationsRead = { date, texts };
  await connectDb();

  // Load the current affirmations + streak to decide whether today counts as
  // complete (all current affirmations read) and, if so, advance the streak.
  const user = await User.findById(session.user.id)
    .select("affirmations affirmationStreak")
    .lean<{
      affirmations?: string[];
      affirmationStreak?: AffirmationStreak;
    }>();

  const affirmations = user?.affirmations ?? [];
  const readSet = new Set(texts);
  const allRead =
    !!date &&
    affirmations.length > 0 &&
    affirmations.every((a) => readSet.has(a));

  let streak = user?.affirmationStreak ?? EMPTY_STREAK;
  if (allRead) streak = advanceStreak(streak, date);

  await User.findByIdAndUpdate(session.user.id, {
    affirmationsRead,
    affirmationStreak: streak,
  });

  return NextResponse.json({ read: affirmationsRead, streak });
}
