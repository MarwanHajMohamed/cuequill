/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Undo a buggy IBKR sync that duplicated trades.
 *
 * Strategy:
 *   For every trade that has an `ibkrTradeId`, build a natural key
 *   (symbol + qty + strike + option + dateBought + dateClosed). If any
 *   OTHER trade in the same user's collection shares that natural key,
 *   the ibkrTradeId one is the duplicate inserted by the sync — delete it.
 *
 * The "original" trade (the one without ibkrTradeId, or with a different
 * ibkrTradeId that already existed before this sync) is always preserved.
 *
 * Run:
 *   node scripts/undo-ibkr-duplicates.js               # dry-run
 *   node scripts/undo-ibkr-duplicates.js --apply       # delete dupes
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

(function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
})();

const APPLY = process.argv.includes("--apply");

const Trade =
  mongoose.models.Trade ||
  mongoose.model(
    "Trade",
    new mongoose.Schema({}, { strict: false, collection: "trades" }),
  );

// Use calendar DAY for buy/sell — manual trades store dates as midnight
// UTC while IBKR-imported trades have actual intraday timestamps. Both
// describe the same real-world trade if they fall on the same trading day.
function dayPart(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toISOString().split("T")[0];
}

function naturalKey(t) {
  return `${t.userID}|${t.symbol}|${t.qty}|${t.strike}|${t.option}|${dayPart(t.dateBought)}|${dayPart(t.dateClosed)}`;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const all = await Trade.find({}).lean();
  console.log(`Loaded ${all.length} trades total`);

  // Group all trades by natural key.
  const byKey = new Map();
  for (const t of all) {
    const k = naturalKey(t);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(t);
  }

  // For each natural-key group:
  //   - If the group has manual (no ibkrTradeId) trades, the IBKR-imported
  //     ones are the duplicates — delete ALL of them. The manual trades
  //     are the original truth.
  //   - If the group is ALL IBKR-imported (no manual at all), keep the
  //     earliest one and delete the rest (intra-sync duplicates).
  // Never delete a trade without an ibkrTradeId — that's an original.
  const toDelete = [];
  let groupsWithDupes = 0;
  for (const [, group] of byKey) {
    if (group.length < 2) continue;
    groupsWithDupes++;

    const manuals = group.filter((t) => !t.ibkrTradeId);
    const imported = group.filter((t) => t.ibkrTradeId);

    if (manuals.length > 0) {
      // Manual truth exists — every IBKR import on this key is a duplicate.
      toDelete.push(...imported);
    } else {
      // All IBKR — keep the earliest, delete the rest.
      const sorted = imported.sort((a, b) =>
        String(a._id).localeCompare(String(b._id)),
      );
      toDelete.push(...sorted.slice(1));
    }
  }

  console.log(`Groups with duplicates: ${groupsWithDupes}`);
  console.log(`Candidates to delete: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log("Nothing to undo.");
    await mongoose.disconnect();
    return;
  }

  if (toDelete.length <= 30) {
    console.log("\nWill delete:");
    for (const t of toDelete) {
      console.log(
        `  ${t.symbol} qty=${t.qty} strike=${t.strike} ${t.option} ${t.status} bought=${new Date(t.dateBought).toISOString()} ibkrTradeId=${t.ibkrTradeId}`,
      );
    }
  } else {
    console.log(`(${toDelete.length} trades — first 10 shown)`);
    for (const t of toDelete.slice(0, 10)) {
      console.log(
        `  ${t.symbol} qty=${t.qty} strike=${t.strike} ${t.option} ${t.status} bought=${new Date(t.dateBought).toISOString()}`,
      );
    }
  }

  if (!APPLY) {
    console.log("\nDRY RUN — re-run with --apply to delete.");
    await mongoose.disconnect();
    return;
  }

  console.log(`\nDeleting ${toDelete.length} duplicate trades...`);
  const ids = toDelete.map((t) => t._id);
  const result = await Trade.deleteMany({ _id: { $in: ids } });
  console.log(`Deleted ${result.deletedCount} trades.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
