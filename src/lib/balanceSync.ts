import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import { BalanceSnapshot } from "@/lib/models/BalanceSnapshot";
import { fetchIbkrEquitySummary } from "@/lib/brokers/ibkr";

// Pull the account's daily NAV from IBKR's Flex "Equity Summary in Base"
// query and upsert each day onto the balance timeline (source: "ibkr").
// Manual snapshots share the same (userID, date) slot, so a hand-entered
// correction for a day is overwritten by a later IBKR pull only if IBKR
// also reports that day — otherwise it's left untouched.
export async function syncBalanceForUser(
  userId: string,
): Promise<{ upserted: number; fetched: number }> {
  await connectDb();

  const points = await fetchIbkrEquitySummary(userId);

  if (points.length === 0) {
    await User.findByIdAndUpdate(userId, { ibkrBalanceLastSync: new Date() });
    return { upserted: 0, fetched: 0 };
  }

  const ops = points.map((p) => ({
    updateOne: {
      filter: { userID: userId, date: p.date },
      update: {
        $set: { balance: p.total, source: "ibkr" },
        $setOnInsert: { userID: userId, date: p.date },
      },
      upsert: true,
    },
  }));

  const res = await BalanceSnapshot.bulkWrite(ops);
  await User.findByIdAndUpdate(userId, { ibkrBalanceLastSync: new Date() });

  const upserted =
    (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
  return { upserted, fetched: points.length };
}
