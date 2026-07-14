import { NextResponse } from "next/server";
import { Resend } from "resend";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";

// Runs hourly via GitHub Actions. For each user whose local time is
// currently in the 8am hour (i.e. 08:00–08:59 in their configured
// timezone), sends a "read your affirmations" nudge — unless they've
// already been emailed today or already ticked off all their
// affirmations for the day. Idempotent per local calendar day via
// `emailAffirmationsLastSentDate`.

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FROM =
  process.env.RESEND_FROM ??
  "Cuequill <affirmations@cuequill.com>";
const REPLY_TO = process.env.RESEND_REPLY_TO;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cuequill.com";

// Returns ok + a human reason so a 401 says WHICH check failed instead of
// a blanket "Unauthorized". Never returns or logs the secret itself.
function checkAuth(req: Request): { ok: boolean; reason: string } {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  // Vercel-signed cron header, kept as a fallback.
  if (req.headers.get("x-vercel-cron")) return { ok: true, reason: "vercel" };
  // If no secret is configured the endpoint is open (dev/first-run).
  if (!secret) return { ok: true, reason: "no-secret-open" };
  if (!auth) {
    return { ok: false, reason: "no Authorization header was received" };
  }
  if (auth !== `Bearer ${secret}`) {
    return {
      ok: false,
      reason: "Authorization header did not match CRON_SECRET",
    };
  }
  return { ok: true, reason: "bearer" };
}

// Current hour (0–23) in an IANA timezone. Falls back to UTC if the
// zone is invalid or missing so a bad tz doesn't crash the run.
function localHour(now: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const h = parts.find((p) => p.type === "hour")?.value ?? "0";
    // "en-US" with hour12:false returns "24" for midnight in some
    // engines; normalize to 0.
    const n = Number(h);
    return n === 24 ? 0 : n;
  } catch {
    return now.getUTCHours();
  }
}

// Local calendar date (yyyy-MM-dd) in the user's timezone. Used as
// the dedupe key for "already emailed / already read today".
function localDate(now: Date, tz: string): string {
  try {
    // en-CA gives ISO-8601 style yyyy-MM-dd directly.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().split("T")[0];
  }
}

function renderEmail({
  firstname,
  affirmationsUrl,
}: {
  firstname: string;
  affirmationsUrl: string;
}) {
  const greeting = firstname ? `Good morning, ${firstname}` : "Good morning";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0e0e10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#15141a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <tr><td style="padding:28px 28px 20px 28px;">
            <div style="font-size:11px;letter-spacing:0.12em;color:#5eead4;font-weight:600;">CUEQUILL</div>
            <div style="margin-top:10px;font-size:22px;font-weight:600;line-height:1.25;">${greeting} — read your affirmations before the open.</div>
            <div style="margin-top:12px;font-size:14px;line-height:1.55;color:rgba(244,244,245,0.65);">
              You haven't checked off today's affirmations yet. Take two minutes to reset your mindset before the market opens.
            </div>
            <div style="margin-top:24px;">
              <a href="${affirmationsUrl}" style="display:inline-block;background:rgba(20,184,166,0.2);border:1px solid rgba(20,184,166,0.45);color:#5eead4;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;">
                Open my affirmations
              </a>
            </div>
          </td></tr>
          <tr><td style="padding:16px 28px 24px 28px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:rgba(244,244,245,0.4);line-height:1.5;">
            Don't want these? Turn them off under
            <a href="${APP_URL}/settings" style="color:rgba(244,244,245,0.6);">Settings → Notifications</a>.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function GET(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) {
    const header = req.headers.get("authorization");
    console.warn("[cron/affirmations] 401:", auth.reason, {
      hasSecret: !!process.env.CRON_SECRET,
      secretLen: process.env.CRON_SECRET?.length ?? 0,
      hasAuthHeader: !!header,
      authHeaderLen: header?.length ?? 0,
      startsWithBearer: header?.startsWith("Bearer ") ?? false,
    });
    return NextResponse.json(
      { error: "Unauthorized", reason: auth.reason },
      { status: 401 },
    );
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
  await connectDB();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();

  // Smoke test: `?email=you@example.com` sends one email straight away,
  // bypassing the 8am window and the once-a-day dedupe, and returns the
  // Resend result so delivery failures (unverified domain, bad
  // recipient, …) are visible immediately. Auth is already enforced
  // above, so only the cron secret holder can trigger it.
  const testEmail = new URL(req.url).searchParams.get("email");
  if (testEmail) {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: testEmail,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      subject: "Read your affirmations before the open",
      html: renderEmail({
        firstname: "",
        affirmationsUrl: `${APP_URL}/affirmations`,
      }),
    });
    return NextResponse.json(
      { test: true, to: testEmail, from: FROM, id: data?.id ?? null, error },
      { status: error ? 502 : 200 },
    );
  }

  // Only load users who plausibly need a reminder: opted in AND have
  // at least one affirmation configured. Timezone is filtered in-app
  // since we need `Intl` for hour math.
  const candidates = await User.find({
    emailAffirmationsReminder: { $ne: false },
    affirmations: { $exists: true, $type: "array", $ne: [] },
    email: { $exists: true, $ne: "" },
  })
    .select(
      "email firstname timezone affirmations affirmationsRead emailAffirmationsLastSentDate",
    )
    .lean<
      Array<{
        _id: unknown;
        email: string;
        firstname?: string;
        timezone?: string;
        affirmations: string[];
        affirmationsRead?: { date?: string; texts?: string[] };
        emailAffirmationsLastSentDate?: string;
      }>
    >();

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const u of candidates) {
    const tz = u.timezone || "UTC";
    const hour = localHour(now, tz);
    if (hour !== 8) {
      skipped++;
      continue;
    }
    const today = localDate(now, tz);
    if (u.emailAffirmationsLastSentDate === today) {
      skipped++;
      continue;
    }
    const read = u.affirmationsRead;
    const alreadyDone =
      !!read &&
      read.date === today &&
      Array.isArray(read.texts) &&
      read.texts.length >= u.affirmations.length;
    if (alreadyDone) {
      skipped++;
      continue;
    }

    try {
      // Resend's SDK resolves with { data, error } and does NOT throw
      // on API-level failures (unverified domain, invalid recipient,
      // rate limit, …). Inspect `error` explicitly — otherwise a
      // rejected send would look successful and we'd wrongly stamp the
      // dedupe date, so nothing sends today AND it never retries.
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: u.email,
        ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
        subject: "Read your affirmations before the open",
        html: renderEmail({
          firstname: u.firstname ?? "",
          affirmationsUrl: `${APP_URL}/affirmations`,
        }),
      });
      if (error) {
        errors.push(`${u.email}: ${error.message ?? JSON.stringify(error)}`);
        continue;
      }
      await User.findByIdAndUpdate(u._id, {
        emailAffirmationsLastSentDate: today,
      });
      sent++;
      void data;
    } catch (err) {
      errors.push(
        `${u.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return NextResponse.json({
    ran: candidates.length,
    sent,
    skipped,
    errors,
  });
  } catch (err) {
    // Surface the real cause (DB/Resend/etc.) as a readable message
    // instead of an opaque 500 so the cron log is diagnosable.
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "affirmations-reminder failed",
      },
      { status: 500 },
    );
  }
}

// QStash publishes as POST by default; mirror GET so the job runs whether
// the schedule's method is GET or POST.
export async function POST(req: Request) {
  return GET(req);
}
