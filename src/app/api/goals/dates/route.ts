import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import Goal from "@/lib/models/Goal";

// Returns the distinct months (or days, for the daily period) the
// authenticated user has set goals in. Previously trusted the query
// `userId` so a logged-in user could see another user's goal history.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDb();

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "monthly";

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    if (period === "daily") {
      const results = await Goal.aggregate([
        { $match: { userId: userObjectId, period: "daily" } },
        {
          $project: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
        },
        {
          $group: {
            _id: { year: "$year", month: "$month", day: "$day" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      ]);

      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const filtered = results
        .map((r) => ({
          year: r._id.year,
          month: r._id.month - 1,
          day: r._id.day,
        }))
        .filter(
          (r) =>
            !(
              r.year === currentYear &&
              r.month === currentMonth &&
              r.day === currentDay
            )
        );

      return NextResponse.json(filtered);
    }

    const results = await Goal.aggregate([
      {
        $match: {
          userId: userObjectId,
          $or: [{ period: "monthly" }, { period: { $exists: false } }],
        },
      },
      {
        $project: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filtered = results
      .map((r) => ({
        year: r._id.year,
        month: r._id.month - 1,
      }))
      .filter((r) => !(r.year === currentYear && r.month === currentMonth));

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("Error fetching available dates:", err);
    return NextResponse.json(
      { error: "Failed to fetch available goal dates" },
      { status: 500 }
    );
  }
}
