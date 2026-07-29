import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { levelInfo } from "@/lib/challenges";

// GET /api/user/profile — display preferences + read-only account info.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "currency startingBalance riskPerTrade avatarColor avatarFrame xp isPro proManualOverride stripeCurrentPeriodEnd stripeCancelAtPeriodEnd",
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    currency: user.currency ?? "USD",
    startingBalance: user.startingBalance ?? 0,
    riskPerTrade: user.riskPerTrade ?? null,
    avatarColor: user.avatarColor ?? "teal",
    avatarFrame: user.avatarFrame ?? "none",
    ...levelInfo(user.xp ?? 0),
    isPro: !!user.isPro,
    proManualOverride: !!user.proManualOverride,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd ?? null,
    stripeCancelAtPeriodEnd: !!user.stripeCancelAtPeriodEnd,
    // Derive "member since" from the ObjectId — no schema change needed.
    memberSince: new mongoose.Types.ObjectId(session.user.id)
      .getTimestamp()
      .toISOString(),
  });
}

// PATCH /api/user/profile
// Updates the signed-in user's identity (firstname / surname / email)
// and optionally their password. A password change requires the
// current password for verification - same standard as the sign-in
// flow, just reused.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    firstname?: string;
    surname?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    currency?: string;
    startingBalance?: number;
    riskPerTrade?: number | null;
    avatarColor?: string;
    avatarFrame?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectDb();
  // The schema hides `password` by default (select:false). We need
  // it here for the current-password check, so opt back in.
  const user = await User.findById(session.user.id).select("+password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ── Validation ──────────────────────────────────────────────────────
  const firstname = body.firstname?.trim();
  const surname = body.surname?.trim();
  const email = body.email?.trim().toLowerCase();

  if (firstname !== undefined && firstname.length === 0) {
    return NextResponse.json(
      { error: "First name can't be empty" },
      { status: 400 },
    );
  }
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }
    // Check email isn't taken by another user.
    if (email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 },
        );
      }
    }
  }

  // ── Password change (optional) ──────────────────────────────────────
  if (body.newPassword) {
    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (!body.currentPassword) {
      return NextResponse.json(
        { error: "Current password required to change password" },
        { status: 400 },
      );
    }
    const ok = await bcrypt.compare(body.currentPassword, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 403 },
      );
    }
    // Cost factor 12 matches OWASP's 2023 guidance for bcrypt on
    // modern hardware — meaningfully harder to brute-force offline
    // than the old default of 10.
    user.password = await bcrypt.hash(body.newPassword, 12);
  }

  // ── Apply identity changes ──────────────────────────────────────────
  if (firstname !== undefined) user.firstname = firstname;
  if (surname !== undefined) user.surname = surname;
  if (email !== undefined) user.email = email;

  // ── Apply preference changes (all optional, validated leniently) ────
  if (body.currency !== undefined) {
    const code = String(body.currency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      return NextResponse.json(
        { error: "Currency must be a 3-letter code" },
        { status: 400 },
      );
    }
    user.currency = code;
  }
  if (body.startingBalance !== undefined) {
    const n = Number(body.startingBalance);
    if (!Number.isFinite(n)) {
      return NextResponse.json(
        { error: "Starting balance must be a number" },
        { status: 400 },
      );
    }
    user.startingBalance = n;
  }
  if (body.riskPerTrade !== undefined) {
    if (body.riskPerTrade === null || body.riskPerTrade === ("" as unknown)) {
      user.riskPerTrade = undefined;
    } else {
      const n = Number(body.riskPerTrade);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json(
          { error: "Risk per trade must be between 0 and 100" },
          { status: 400 },
        );
      }
      user.riskPerTrade = n;
    }
  }
  if (body.avatarColor !== undefined) {
    user.avatarColor = String(body.avatarColor).slice(0, 20);
  }
  if (body.avatarFrame !== undefined) {
    user.avatarFrame = String(body.avatarFrame).slice(0, 20);
  }

  await user.save();

  return NextResponse.json({
    success: true,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
    currency: user.currency,
    startingBalance: user.startingBalance,
    riskPerTrade: user.riskPerTrade ?? null,
    avatarColor: user.avatarColor,
    avatarFrame: user.avatarFrame,
  });
}
