import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { Waitlist } from "@/lib/models/Waitlist";
import { LAUNCH_AT, isPreLaunch } from "@/lib/launch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Self-serve account creation with email + password. OAuth (Google/Apple)
// sign-up goes through NextAuth's signIn callback instead; this route is
// the credentials path.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Case-insensitive collation, matching the sign-in lookup in auth.ts so a
// "Marwan@…" row is found when someone registers "marwan@…".
const EMAIL_COLLATION = { locale: "en", strength: 2 } as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const firstname =
    typeof body.firstname === "string" ? body.firstname.trim().slice(0, 60) : "";
  const surname =
    typeof body.surname === "string" ? body.surname.trim().slice(0, 60) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim().slice(0, 64)
      : null;

  if (!firstname) {
    return NextResponse.json(
      { error: "Please enter your first name." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  await connectDb();

  // Reject duplicates up front (the unique index is the real guard, but
  // this gives a friendly message instead of a 500 on the race).
  const existing = await User.findOne({ email })
    .collation(EMAIL_COLLATION)
    .select("_id");
  if (existing) {
    return NextResponse.json(
      { error: "That email is already registered. Try signing in instead." },
      { status: 409 },
    );
  }

  // Cost factor 12 matches the password-change route and OWASP guidance.
  const hashed = await bcrypt.hash(password, 12);

  // Pre-launch: create the account but lock it until the launch date so it
  // can't sign in yet. After launch, new accounts are created unlocked.
  const preLaunch = isPreLaunch();

  try {
    await User.create({
      email,
      firstname,
      surname,
      password: hashed,
      timezone,
      ...(preLaunch ? { preLaunchLockUntil: LAUNCH_AT } : {}),
    });
  } catch (err) {
    // Unique-index violation from a concurrent registration of the same
    // email - treat as the duplicate case rather than a server error.
    if (
      err &&
      typeof err === "object" &&
      (err as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "That email is already registered. Try signing in instead." },
        { status: 409 },
      );
    }
    console.error("[auth/register]", err);
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 },
    );
  }

  // Also record the signup on the waitlist (idempotent - ignore a
  // duplicate email). Best-effort: a waitlist hiccup shouldn't fail the
  // account creation that already succeeded.
  try {
    await Waitlist.updateOne(
      { email },
      { $setOnInsert: { email, firstname, source: "signup" } },
      { upsert: true },
    );
  } catch {
    /* non-fatal */
  }

  // `locked` tells the client whether to sign the user in (post-launch) or
  // show the "opens on launch day" confirmation (pre-launch).
  return NextResponse.json({ ok: true, locked: preLaunch }, { status: 201 });
}
