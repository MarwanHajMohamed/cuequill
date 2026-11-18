import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { checkCronAuth, localHour, localDate } from "@/lib/cron/time";
import {
  fetchEconCalendar,
  eventsForDate,
  type EconEvent,
} from "@/lib/econ/calendar";
import { sendPushToUser } from "@/lib/push/send";

// Runs hourly (QStash). For each opted-in user whose local time is in the
// configured evening hour, if an economic event (FOMC / CPI / PPI / PCE) lands
// the NEXT day, sends a native push heads-up. One hourly fire covers every
// timezone; deduped per user per event-day via pushEconLastSentKey.

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.cuequill.com";
// Local hour at which the day-before heads-up goes out (default 6pm).
const SEND_HOUR = Number(process.env.PUSH_ECON_HOUR ?? "18");

// Turn one or more events into a short, natural sentence.
function buildMessage(events: EconEvent[]): { title: string; body: string } {
  const names = events.map((e) => e.label);
  let list: string;
  if (names.length === 1) list = names[0];
  else if (names.length === 2) list = `${names[0]} and ${names[1]}`;
  else list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  const title = events.length === 1 ? `${events[0].label} tomorrow` : "Market events tomorrow";
  const body =
    names.length === 1
      ? `${list} is tomorrow - expect volatility around the release.`
      : `${list} are tomorrow - expect volatility.`;
  return { title, body };
}

export async function GET(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }

  try {
    await connectDB();
    const now = new Date();
    const cal = await fetchEconCalendar(APP_URL);

    // Smoke test: ?email= sends a sample heads-up now, bypassing the window
    // and dedupe, using whatever events fall tomorrow in UTC (or a generic
    // line if none), so delivery can be verified end to end.
    const testEmail = new URL(req.url).searchParams.get("email");
    if (testEmail) {
      const u = await User.findOne({ email: testEmail }).select("_id timezone").lean<{
        _id: unknown;
        timezone?: string;
      }>();
      if (!u) return NextResponse.json({ error: "No such user" }, { status: 404 });
      const tomorrow = localDate(now, u.timezone || "UTC", 1);
      const events = eventsForDate(cal, tomorrow);
      const msg =
        events.length > 0
          ? buildMessage(events)
          : { title: "Test notification", body: "Push notifications are working." };
      const res = await sendPushToUser(String(u._id), {
        ...msg,
        data: { url: "/calendar" },
        threadId: "econ",
      });
      return NextResponse.json({ test: true, to: testEmail, events, ...res });
    }

    const candidates = await User.find({
      pushEconReminder: true,
    })
      .select("timezone pushEconLastSentKey")
      .lean<Array<{ _id: unknown; timezone?: string; pushEconLastSentKey?: string }>>();

    let sentUsers = 0;
    let skipped = 0;
    let noDevice = 0;

    for (const u of candidates) {
      const tz = u.timezone || "UTC";
      if (localHour(now, tz) !== SEND_HOUR) {
        skipped++;
        continue;
      }
      const tomorrow = localDate(now, tz, 1);
      const events = eventsForDate(cal, tomorrow);
      if (events.length === 0) {
        skipped++;
        continue;
      }
      const key = `${tomorrow}:${events.map((e) => e.kind).join(",")}`;
      if (u.pushEconLastSentKey === key) {
        skipped++;
        continue;
      }

      const msg = buildMessage(events);
      const res = await sendPushToUser(String(u._id), {
        ...msg,
        data: { url: "/calendar" },
        threadId: "econ",
        collapseId: key,
      });
      if (res.sent > 0) {
        await User.findByIdAndUpdate(u._id, { pushEconLastSentKey: key });
        sentUsers++;
      } else {
        noDevice++;
      }
    }

    return NextResponse.json({
      ran: candidates.length,
      sentUsers,
      skipped,
      noDevice,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "push-econ-reminders failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
