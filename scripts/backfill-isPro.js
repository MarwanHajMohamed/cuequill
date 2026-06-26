/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Backfill `isPro: true` on every existing User document.
 *
 * Run once after deploying the membership change so existing accounts
 * are grandfathered as Pro. New signups default to free via the
 * schema's `default: false`.
 *
 * Usage:
 *   node scripts/backfill-isPro.js               # dry-run, prints plan
 *   node scripts/backfill-isPro.js --apply       # writes to DB
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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
})();

async function main() {
  const apply = process.argv.includes("--apply");
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const Users = mongoose.connection.collection("users");

  const filter = { $or: [{ isPro: { $exists: false } }, { isPro: false }] };
  const count = await Users.countDocuments(filter);
  console.log(`Found ${count} user(s) to flip to Pro.`);

  if (!apply) {
    console.log("Dry run — pass --apply to write.");
  } else {
    const res = await Users.updateMany(filter, { $set: { isPro: true } });
    console.log(`Updated ${res.modifiedCount} user(s).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
