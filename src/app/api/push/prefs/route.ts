import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";

// GET /api/push/prefs
// Returns notificationPrefs (with sensible defaults) and a count of
// active push subscriptions so the settings UI can reflect both.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "notificationPrefs pushSubscriptions",
  );

  return NextResponse.json({
    prefs: {
      marketOpen: user?.notificationPrefs?.marketOpen ?? false,
      marketClose: user?.notificationPrefs?.marketClose ?? false,
      eodReminder: user?.notificationPrefs?.eodReminder ?? false,
      fedWarning: user?.notificationPrefs?.fedWarning ?? false,
      affirmations: user?.notificationPrefs?.affirmations ?? false,
      affirmationsTime: user?.notificationPrefs?.affirmationsTime ?? "08:00",
    },
    subscriptionCount: user?.pushSubscriptions?.length ?? 0,
  });
}

// PATCH /api/push/prefs
// Body: partial notification preferences. Anything unspecified is left
// untouched.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  const allowedBools = [
    "marketOpen",
    "marketClose",
    "eodReminder",
    "fedWarning",
    "affirmations",
  ] as const;
  for (const k of allowedBools) {
    if (typeof body[k] === "boolean") {
      update[`notificationPrefs.${k}`] = body[k];
    }
  }
  if (typeof body.affirmationsTime === "string") {
    if (!/^\d{2}:\d{2}$/.test(body.affirmationsTime)) {
      return NextResponse.json(
        { error: "affirmationsTime must be HH:MM" },
        { status: 400 },
      );
    }
    update["notificationPrefs.affirmationsTime"] = body.affirmationsTime;
  }

  await connectDb();
  await User.updateOne({ _id: session.user.id }, { $set: update });

  return NextResponse.json({ success: true });
}
