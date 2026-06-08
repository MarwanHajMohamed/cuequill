import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { sendPush, type NotificationPayload } from "@/lib/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron entry point for all scheduled push notifications.
// Vercel cron pings this every minute (vercel.json); we then figure out
// which notification types are "due right now" in US/Eastern time, and
// only ship subscriptions whose user prefs opt in.
//
// Authentication: accepts either `Authorization: Bearer ${CRON_SECRET}`
// or Vercel's automatic `x-vercel-cron` header.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const isVercelCron = req.headers.has("x-vercel-cron");
  const okAuth =
    isVercelCron ||
    (process.env.CRON_SECRET &&
      auth === `Bearer ${process.env.CRON_SECRET}`);
  if (!okAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ny = nyNow();
  const wd = ny.getDay(); // 0=Sun 6=Sat
  const isWeekday = wd >= 1 && wd <= 5;
  const hhmm = `${pad(ny.getHours())}:${pad(ny.getMinutes())}`;

  // ── Build the set of notification types due this minute ────────────
  type DueType =
    | "marketOpen"
    | "marketClose"
    | "eodReminder"
    | "fedWarning"
    | "affirmations";
  const dueGeneral = new Set<DueType>();
  if (isWeekday) {
    if (hhmm === "09:30") dueGeneral.add("marketOpen");
    if (hhmm === "16:00") dueGeneral.add("marketClose");
    if (hhmm === "16:15") dueGeneral.add("eodReminder");
    // FOMC mornings get a heads-up at 08:30 ET.
    if (hhmm === "08:30") {
      const fed = await isTodayFedDay(ny);
      if (fed) dueGeneral.add("fedWarning");
    }
  }

  await connectDb();

  // Affirmations time is per-user (string "HH:MM" in their timezone).
  // We fetch all users that have any subscription + any opt-in.
  const users = await User.find({
    "pushSubscriptions.0": { $exists: true },
  }).select("pushSubscriptions notificationPrefs timezone");

  type Job = { user: typeof users[number]; payload: NotificationPayload };
  const jobs: Job[] = [];

  for (const u of users) {
    const prefs = u.notificationPrefs ?? null;
    if (!prefs) continue;

    if (dueGeneral.has("marketOpen") && prefs.marketOpen) {
      jobs.push({
        user: u,
        payload: {
          title: "Market open",
          body: "US session is live. Skip the first 30 minutes.",
          url: "/dashboard",
          tag: "market-open",
        },
      });
    }
    if (dueGeneral.has("marketClose") && prefs.marketClose) {
      jobs.push({
        user: u,
        payload: {
          title: "Market closed",
          body: "Session is over. Time to review.",
          url: "/calendar",
          tag: "market-close",
        },
      });
    }
    if (dueGeneral.has("eodReminder") && prefs.eodReminder) {
      jobs.push({
        user: u,
        payload: {
          title: "Log today's trades",
          body: "End-of-day review — capture any trades you took today.",
          url: "/trades",
          tag: "eod",
        },
      });
    }
    if (dueGeneral.has("fedWarning") && prefs.fedWarning) {
      jobs.push({
        user: u,
        payload: {
          title: "Fed day",
          body: "FOMC meeting today — sit it out per the rules.",
          url: "/rules",
          tag: "fed",
        },
      });
    }

    // Affirmations — per-user time + timezone.
    if (prefs.affirmations) {
      const userHHMM = userLocalHHMM(u.timezone);
      const target = prefs.affirmationsTime || "08:00";
      if (userHHMM === target) {
        jobs.push({
          user: u,
          payload: {
            title: "Morning ritual",
            body: "Time to read your affirmations.",
            url: "/affirmations",
            tag: "affirmations",
          },
        });
      }
    }
  }

  // ── Fire all queued jobs ───────────────────────────────────────────
  let delivered = 0;
  let pruned = 0;
  for (const job of jobs) {
    const gone: string[] = [];
    for (const sub of job.user.pushSubscriptions) {
      const r = await sendPush(
        { endpoint: sub.endpoint, keys: sub.keys },
        job.payload,
      );
      if (r.ok) delivered++;
      if (r.gone) gone.push(sub.endpoint);
    }
    if (gone.length > 0) {
      await User.updateOne(
        { _id: job.user._id },
        { $pull: { pushSubscriptions: { endpoint: { $in: gone } } } },
      );
      pruned += gone.length;
    }
  }

  return NextResponse.json({
    ranAt: ny.toISOString(),
    nyHHMM: hhmm,
    weekday: isWeekday,
    types: Array.from(dueGeneral),
    jobs: jobs.length,
    delivered,
    pruned,
  });
}

// ── helpers ────────────────────────────────────────────────────────────
const pad = (n: number) => n.toString().padStart(2, "0");

function nyNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
}

function userLocalHHMM(tz?: string): string {
  const t = tz || "America/New_York";
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: t }));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Lightweight check for whether today is an FOMC meeting day.
// We hit our own `useFedDates` source via the existing API path so
// we don't duplicate the list. If the lookup fails, return false
// (safer to skip than to spam).
async function isTodayFedDay(ny: Date): Promise<boolean> {
  try {
    const yyyy = ny.getFullYear();
    const mm = pad(ny.getMonth() + 1);
    const dd = pad(ny.getDate());
    const today = `${yyyy}-${mm}-${dd}`;
    const base =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    if (!base) return false;
    const res = await fetch(`${base}/api/fed`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      payload?: { meetingDt: string }[];
    };
    return (
      Array.isArray(data.payload) &&
      data.payload.some((m) => m.meetingDt === today)
    );
  } catch {
    return false;
  }
}
