import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { Waitlist } from "@/lib/models/Waitlist";
import { renderLaunchEmail, sendEmail } from "@/lib/email";
import { LAUNCH_AT, isPreLaunch } from "@/lib/launch";

// Emails the waitlist once, on/after launch day, telling them Cuequill is
// open. Runs on a schedule (GitHub Actions) and is a no-op until launch.
// Deduped per person via `launchEmailedAt`, and scoped to people who were
// waiting BEFORE launch (createdAt < LAUNCH_AT) so post-launch signups -
// who create an account and sign in immediately - are never emailed.
// Sends in bounded batches; each run continues where the last left off.

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cuequill.com";
// Cap per invocation so a big list is drained across successive runs
// rather than risking a timeout or a provider rate limit in one go.
const BATCH = 200;

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (req.headers.get("x-vercel-cron")) return true;
  if (!secret) return true; // open in dev / first-run
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Before launch this job does nothing - the announcement only makes sense
  // once the app is actually open.
  if (isPreLaunch()) {
    return NextResponse.json({ skipped: "pre-launch", launchAt: LAUNCH_AT });
  }

  await connectDb();

  const url = `${APP_URL}/login`;

  // Optional smoke test: ?email=you@example.com sends one email straight
  // away (no dedupe write) so delivery can be verified. Auth already
  // enforced above.
  const testEmail = new URL(req.url).searchParams.get("email");
  if (testEmail) {
    const { subject, html, text } = renderLaunchEmail({ url });
    const r = await sendEmail({ to: testEmail, subject, html, text });
    return NextResponse.json(
      { test: true, to: testEmail, ok: r.ok, error: r.error },
      { status: r.ok ? 200 : 502 },
    );
  }

  const pending = await Waitlist.find({
    createdAt: { $lt: LAUNCH_AT },
    launchEmailedAt: { $exists: false },
  })
    .select("email firstname")
    .limit(BATCH)
    .lean<Array<{ _id: unknown; email: string; firstname?: string }>>();

  let sent = 0;
  const errors: string[] = [];

  for (const w of pending) {
    const { subject, html, text } = renderLaunchEmail({
      firstname: w.firstname,
      url,
    });
    const r = await sendEmail({ to: w.email, subject, html, text });
    if (!r.ok) {
      // Leave launchEmailedAt unset so the next run retries this address.
      errors.push(`${w.email}: ${r.error ?? "send failed"}`);
      continue;
    }
    await Waitlist.updateOne(
      { _id: w._id },
      { $set: { launchEmailedAt: new Date() } },
    );
    sent++;
  }

  const remaining = pending.length === BATCH;
  return NextResponse.json({ sent, failed: errors.length, remaining, errors });
}
