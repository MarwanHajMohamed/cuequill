import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { PasswordResetToken } from "@/lib/models/PasswordResetToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Consumes a reset token (from the emailed link) and sets a new password.
// The token is single-use: it's deleted once redeemed, and any other
// outstanding tokens for the same user are cleared too.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json(
      { error: "This reset link is invalid." },
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

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await PasswordResetToken.findOne({ tokenHash });
  // Missing (never issued / already used) or expired both read as an
  // invalid link. The TTL index removes expired rows, but check the time
  // explicitly in case the sweeper hasn't run yet.
  if (!record || record.expiresAt.getTime() < Date.now()) {
    if (record) await PasswordResetToken.deleteOne({ _id: record._id });
    return NextResponse.json(
      { error: "This reset link has expired. Request a new one." },
      { status: 400 },
    );
  }

  const user = await User.findById(record.userId).select("+password");
  if (!user) {
    await PasswordResetToken.deleteMany({ userId: record.userId });
    return NextResponse.json(
      { error: "This reset link is no longer valid." },
      { status: 400 },
    );
  }

  user.password = await bcrypt.hash(password, 12);
  // A successful reset should also lift any brute-force lockout so the
  // user can sign in immediately with the new password.
  user.failedLoginAttempts = 0;
  user.lockedUntil = null as unknown as undefined;
  await user.save();

  // Burn every reset token for this user so the link can't be reused.
  await PasswordResetToken.deleteMany({ userId: user._id });

  return NextResponse.json({ ok: true });
}
