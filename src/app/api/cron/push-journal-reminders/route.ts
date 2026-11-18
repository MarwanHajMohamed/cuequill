import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import {
  checkCronAuth,
  localHour,
  localDate,
  isWeekend,
} from "@/lib/cron/time";
import { sendPushToUser } from "@/lib/push/send";

// Runs hourly (QStash). For each opted-in user whose local time is in the
// configured evening hour on a weekday, sends an end-of-day nudge to log the
// day's trades. Deduped per user per local day via pushJournalLastSentDate.

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Local hour for the nudge (default 9pm). Weekends are skipped since the
// market is shut.
const SEND_HOUR = Number(process.env.PUSH_JOURNAL_HOUR ?? "21");

const TITLE = "Log today's trades";
const BODY = "Take a minute to journal today's trades while they're fresh.";

export async function GET(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }

  try {
    await connectDB();
    const now = new Date();

    // Smoke test: ?email= sends the nudge now, bypassing the window/dedupe.
    const testEmail = new URL(req.url).searchParams.get("email");
    if (testEmail) {
      const u = await User.findOne({ email: testEmail }).select("_id").lean<{
        _id: unknown;
      }>();
      if (!u) return NextResponse.json({ error: "No such user" }, { status: 404 });
      const res = await sendPushToUser(String(u._id), {
        title: TITLE,
        body: BODY,
        data: { url: "/trades" },
        threadId: "journal",
      });
      return NextResponse.json({ test: true, to: testEmail, ...res });
    }

    const candidates = await User.find({
      pushJournalReminder: true,
    })
      .select("timezone pushJournalLastSentDate")
      .lean<Array<{ _id: unknown; timezone?: string; pushJournalLastSentDate?: string }>>();

    let sentUsers = 0;
    let skipped = 0;
    let noDevice = 0;

    for (const u of candidates) {
      const tz = u.timezone || "UTC";
      if (localHour(now, tz) !== SEND_HOUR || isWeekend(now, tz)) {
        skipped++;
        continue;
      }
      const today = localDate(now, tz);
      if (u.pushJournalLastSentDate === today) {
        skipped++;
        continue;
      }

      const res = await sendPushToUser(String(u._id), {
        title: TITLE,
        body: BODY,
        data: { url: "/trades" },
        threadId: "journal",
        collapseId: `journal:${today}`,
      });
      if (res.sent > 0) {
        await User.findByIdAndUpdate(u._id, { pushJournalLastSentDate: today });
        sentUsers++;
      } else {
        noDevice++;
      }
    }

    return NextResponse.json({ ran: candidates.length, sentUsers, skipped, noDevice });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "push-journal-reminders failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
