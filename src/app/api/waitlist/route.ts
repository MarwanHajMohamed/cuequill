import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Waitlist } from "@/lib/models/Waitlist";

// Very small RFC-lite email check. The point isn't to catch every
// invalid address — the browser's input[type=email] already does
// most of the work — it's to reject obvious junk before we hit Mongo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const firstname =
    typeof body.firstname === "string"
      ? body.firstname.trim().slice(0, 60)
      : "";
  const source =
    typeof body.source === "string" ? body.source.trim().slice(0, 40) : "signup";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  await connectDB();

  // Idempotent: signing up twice with the same email succeeds silently
  // instead of erroring, so users bouncing between browsers don't hit
  // a scary duplicate-key page. `existed` lets the UI tailor its copy.
  const existing = await Waitlist.findOne({ email });
  if (existing) {
    return NextResponse.json({ ok: true, existed: true }, { status: 200 });
  }

  await Waitlist.create({
    email,
    firstname: firstname || undefined,
    source: source || "signup",
  });

  return NextResponse.json({ ok: true, existed: false }, { status: 201 });
}
