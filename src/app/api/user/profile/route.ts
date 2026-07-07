import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";

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

  await user.save();

  return NextResponse.json({
    success: true,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
  });
}
