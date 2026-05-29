/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Reset all `fees` values on Cuequill trades back to 0.
 * Use when a backfill needs to be undone.
 *
 * Run:
 *   node scripts/reset-fees.js               # dry-run, prints count
 *   node scripts/reset-fees.js --apply       # writes 0 to every trade
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

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const nonZero = await Trade.countDocuments({
    fees: { $exists: true, $ne: 0, $ne: null },
  });
  console.log(`${nonZero} trades currently have non-zero fees.`);

  if (!APPLY) {
    console.log("DRY RUN — re-run with --apply to reset all fees to 0.");
    await mongoose.disconnect();
    return;
  }

  const result = await Trade.updateMany({}, { $set: { fees: 0 } });
  console.log(`Reset fees on ${result.modifiedCount} trades.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
