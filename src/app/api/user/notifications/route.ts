import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";

// GET  → current notification prefs for the signed-in user.
// PATCH → merge partial prefs. Only known keys are accepted so a
// tampered payload can't set arbitrary schema fields.

const ALLOWED_KEYS = new Set([
  "emailAffirmationsReminder",
  "pushEconReminder",
  "pushJournalReminder",
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findById(session.user.id)
    .select(
      "emailAffirmationsReminder pushEconReminder pushJournalReminder",
    )
    .lean<{
      emailAffirmationsReminder?: boolean;
      pushEconReminder?: boolean;
      pushJournalReminder?: boolean;
    }>();
  // Email reminder defaults ON (opt-out). Push reminders default OFF
  // (opt-in) - they need OS permission + a registered device anyway.
  return NextResponse.json({
    emailAffirmationsReminder: user?.emailAffirmationsReminder !== false,
    pushEconReminder: user?.pushEconReminder === true,
    pushJournalReminder: user?.pushJournalReminder === true,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_KEYS.has(k) && typeof v === "boolean") update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid preferences supplied." },
      { status: 400 },
    );
  }

  await User.findByIdAndUpdate(session.user.id, update);
  return NextResponse.json({ ok: true, ...update });
}
