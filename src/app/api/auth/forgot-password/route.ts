import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { PasswordResetToken } from "@/lib/models/PasswordResetToken";
import { renderPasswordResetEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_COLLATION = { locale: "en", strength: 2 } as const;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cuequill.com";
const EXPIRES_MINUTES = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Always answer 200 with the same message whether or not the address
  // exists - revealing which emails have accounts is an enumeration leak.
  const genericOk = NextResponse.json({ ok: true });

  if (!EMAIL_RE.test(email)) {
    // Still generic - don't hand back a "valid/invalid email" oracle.
    return genericOk;
  }

  await connectDb();
  const user = await User.findOne({ email })
    .collation(EMAIL_COLLATION)
    .select("_id firstname email");
  if (!user) return genericOk;

  // Raw token goes in the email link; only its hash is stored, so a DB
  // leak can't be used to reset anyone's password.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // One live token per user: drop any previous ones first.
  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000),
  });

  const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
  const { subject, html, text } = renderPasswordResetEmail({
    firstname: user.firstname,
    resetUrl,
    expiresMinutes: EXPIRES_MINUTES,
  });

  const result = await sendEmail({ to: user.email, subject, html, text });
  if (!result.ok) {
    // Log for ops, but keep the response generic so the flow doesn't
    // reveal whether the address exists or that delivery failed.
    console.error("[auth/forgot-password] send failed:", result.error);
  }

  return genericOk;
}
