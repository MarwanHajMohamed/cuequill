import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { friendStatesFor, type FriendStatus } from "@/lib/friends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/users/search?q= - find people to add as friends by name or email.
// Names aren't unique, so the full name shows with the (unique) email beneath
// to disambiguate. Each result carries the caller's current relationship so
// the UI can render the right action.

export type UserSearchResult = {
  id: string;
  name: string; // full "First Last"
  email: string; // masked, e.g. "j•••@gmail.com"
  avatarColor: string;
  avatarFrame: string;
  friendStatus: FriendStatus;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Mask an email for display: keep the first character of the local part and
// the domain (so people can still tell accounts apart), hide the rest.
// e.g. "jane.doe@gmail.com" -> "j•••@gmail.com".
function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email ? "•••" : "";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const first = local.charAt(0);
  return `${first}•••@${domain}`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  await connectDb();
  const meId = session.user.id;

  const rx = new RegExp(escapeRegex(q), "i");
  const terms = q.split(/\s+/).filter(Boolean).map(escapeRegex);
  const or: Record<string, unknown>[] = [
    { email: rx },
    { firstname: rx },
    { surname: rx },
  ];
  // A "first last" query also matches when the two words hit the two fields.
  if (terms.length >= 2) {
    or.push({
      $and: [
        { firstname: new RegExp(terms[0], "i") },
        { surname: new RegExp(terms[terms.length - 1], "i") },
      ],
    });
  }

  const users = await User.find({ _id: { $ne: meId }, $or: or })
    .select("firstname surname email avatarColor avatarFrame")
    .limit(12)
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        firstname?: string;
        surname?: string;
        email?: string;
        avatarColor?: string;
        avatarFrame?: string;
      }[]
    >();

  const states = await friendStatesFor(
    meId,
    users.map((u) => String(u._id)),
  );

  const results: UserSearchResult[] = users.map((u) => {
    const name =
      [(u.firstname ?? "").trim(), (u.surname ?? "").trim()]
        .filter(Boolean)
        .join(" ") || "Trader";
    return {
      id: String(u._id),
      name,
      email: maskEmail(u.email ?? ""),
      avatarColor: u.avatarColor ?? "teal",
      avatarFrame: u.avatarFrame ?? "none",
      friendStatus: states.get(String(u._id)) ?? "none",
    };
  });

  return NextResponse.json({ results });
}
