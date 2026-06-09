/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Tag every PUT trade whose ENTRY time falls in a given clock window
 * with the "First Red Opening Candle" strategy.
 *
 * Defaults to the user's request: 14:58 to 15:00 inclusive, interpreted
 * in US/Eastern (the trading day's natural frame). Pass --tz=UTC to
 * match by UTC wall-clock instead, or --window=09:30-09:32 etc.
 *
 * Run:
 *   node scripts/tag-first-red-opening-candle.js          # dry-run
 *   node scripts/tag-first-red-opening-candle.js --apply  # writes DB
 *
 * Options:
 *   --apply              actually persist changes (default = dry run)
 *   --tz=US/Eastern      timezone to interpret dateBought in
 *   --window=14:58-15:00 HH:MM-HH:MM window (inclusive)
 *   --user=<id>          restrict to a single userID (default = all)
 *   --include-simulated  also touch simulated:true trades
 *   --overwrite          overwrite ANY existing strategy on matched
 *                        trades (default = only tag trades whose
 *                        strategy is empty, "Other", or already
 *                        "First Red Opening Candle")
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
const INCLUDE_SIMULATED = process.argv.includes("--include-simulated");
const OVERWRITE = process.argv.includes("--overwrite");
const TARGET_STRATEGY = "First Red Opening Candle";

function argValue(name, def) {
  for (const a of process.argv) {
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
  }
  return def;
}

const TZ = argValue("tz", "US/Eastern");
const WINDOW = argValue("window", "14:58-15:00");
const USER_ID = argValue("user", null);

// Parse HH:MM-HH:MM into minute-of-day bounds (inclusive of both ends).
function parseWindow(w) {
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(w);
  if (!m) throw new Error(`Bad --window "${w}", expected HH:MM-HH:MM`);
  const a = Number(m[1]) * 60 + Number(m[2]);
  const b = Number(m[3]) * 60 + Number(m[4]);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

const win = parseWindow(WINDOW);

const Trade =
  mongoose.models.Trade ||
  mongoose.model(
    "Trade",
    new mongoose.Schema({}, { strict: false, collection: "trades" }),
  );

// Return the minute-of-day of `d` interpreted in `tz`. Uses Intl so we
// don't have to ship a tz database.
function minuteOfDayIn(date, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function hhmmIn(date, tz) {
  const m = minuteOfDayIn(date, tz);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const q = { option: "PUT" };
  if (!INCLUDE_SIMULATED) q.simulated = { $ne: true };
  if (USER_ID) {
    if (!mongoose.Types.ObjectId.isValid(USER_ID)) {
      throw new Error(`--user is not a valid ObjectId: ${USER_ID}`);
    }
    q.userID = new mongoose.Types.ObjectId(USER_ID);
  }

  const trades = await Trade.find(q).lean();
  console.log(
    `Scanned ${trades.length} PUT trades. Window: ${WINDOW} ${TZ}.`,
    `Simulated included: ${INCLUDE_SIMULATED}.`,
    USER_ID ? `Scoped to user ${USER_ID}.` : "All users.",
  );

  const matches = [];
  for (const t of trades) {
    if (!t.dateBought) continue;
    const d = new Date(t.dateBought);
    if (isNaN(d.getTime())) continue;
    const m = minuteOfDayIn(d, TZ);
    if (m < win.start || m > win.end) continue;

    const existing = (t.strategy ?? "").trim();
    // Treat "Other" as effectively unset — it's the catch-all bucket
    // and should be replaced by a more specific tag when we have one.
    const isReplaceable =
      !existing ||
      existing === TARGET_STRATEGY ||
      existing.toLowerCase() === "other";
    const willSkip = !OVERWRITE && !isReplaceable;
    matches.push({
      _id: t._id,
      userID: t.userID,
      symbol: t.symbol,
      qty: t.qty,
      strike: t.strike,
      dateBoughtUtc: d.toISOString(),
      tzClock: hhmmIn(d, TZ),
      existingStrategy: existing,
      willSkip,
      alreadyTagged: existing === TARGET_STRATEGY,
    });
  }

  const toTag = matches.filter((m) => !m.willSkip && !m.alreadyTagged);
  const alreadyTagged = matches.filter((m) => m.alreadyTagged);
  const skipped = matches.filter((m) => m.willSkip);

  console.log(
    `\nIn-window matches: ${matches.length}`,
    `\n  - to be tagged:    ${toTag.length}`,
    `\n  - already tagged:  ${alreadyTagged.length}`,
    `\n  - skipped (has other strategy, use --overwrite): ${skipped.length}`,
  );

  if (matches.length > 0) {
    console.log("\nSample of in-window trades:");
    for (const m of matches.slice(0, 25)) {
      console.log(
        `  ${m.dateBoughtUtc.slice(0, 10)} ${m.tzClock} ${TZ} | ${m.symbol} PUT ${m.strike} x${m.qty} | strategy: "${m.existingStrategy || "—"}"${m.alreadyTagged ? " [already tagged]" : m.willSkip ? " [SKIP - has other strategy]" : ""}`,
      );
    }
    if (matches.length > 25) console.log(`  ... and ${matches.length - 25} more`);
  }

  if (!APPLY) {
    console.log(
      "\nDRY RUN. Re-run with --apply to write changes.",
      OVERWRITE ? "(Will OVERWRITE existing strategies on matched trades.)" : "",
    );
    await mongoose.disconnect();
    return;
  }

  if (toTag.length === 0) {
    console.log("\nNothing to write.");
    await mongoose.disconnect();
    return;
  }

  const result = await Trade.updateMany(
    { _id: { $in: toTag.map((m) => m._id) } },
    { $set: { strategy: TARGET_STRATEGY } },
  );
  console.log(
    `\nUpdated ${result.modifiedCount} trade(s) to strategy="${TARGET_STRATEGY}".`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
