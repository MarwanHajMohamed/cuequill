import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import Goal from "@/lib/models/Goal";

export async function GET(req: NextRequest) {
  await connectDb();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const period = searchParams.get("period") ?? "monthly";

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

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
