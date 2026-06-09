/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * List every PUT entry in your IBKR file whose trade_time falls in a
 * given clock window, joined against the Cuequill DB so we know which
 * are CALLs vs PUTs.
 *
 *   node scripts/list-window-puts.js
 *   node scripts/list-window-puts.js --window=14:58-15:00   (default)
 *   node scripts/list-window-puts.js --tz=UTC               (default)
 *   node scripts/list-window-puts.js --tz=America/New_York
 *   node scripts/list-window-puts.js --all                  show CALLs too
 *
 * The matcher pairs each IBKR BUY with a Cuequill trade on the same
 * day with the same symbol and qty, and an entry contractPrice within
 * 1 cent. If a row shows "?" in the OPTION column it means no Cuequill
 * trade matched the IBKR order (likely a manually-entered duplicate or
 * one that was never imported).
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

function arg(name, def) {
  for (const a of process.argv) {
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
  }
  return def;
}
const SHOW_ALL = process.argv.includes("--all");
const TZ = arg("tz", "UTC");
const WINDOW = arg("window", "14:58-15:00");

function parseWindow(w) {
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(w);
  if (!m) throw new Error(`Bad --window "${w}"`);
  const a = +m[1] * 60 + +m[2];
  const b = +m[3] * 60 + +m[4];
  return { start: Math.min(a, b), end: Math.max(a, b) };
}
const win = parseWindow(WINDOW);

function minuteOfDayIn(d, tz) {
  if (tz === "UTC") return d.getUTCHours() * 60 + d.getUTCMinutes();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return (
    +parts.find((p) => p.type === "hour").value * 60 +
    +parts.find((p) => p.type === "minute").value
  );
}
function hhmm(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function nyClock(d) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }
  const ibkr = JSON.parse(
    fs.readFileSync(path.join(__dirname, "ibkr-trades.json"), "utf8"),
  );

  // Filter IBKR option BUYs in the requested window.
  const buys = ibkr.trades
    .filter((t) => t.sec_type === "OPT" && t.side === "BUY")
    .filter((t) => {
      const d = new Date(t.trade_time);
      const m = minuteOfDayIn(d, TZ);
      return m >= win.start && m <= win.end;
    })
    .sort((a, b) => a.trade_time.localeCompare(b.trade_time));

  if (buys.length === 0) {
    console.log("No IBKR option BUYs in that window.");
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const Trade =
    mongoose.models.Trade ||
    mongoose.model(
      "Trade",
      new mongoose.Schema({}, { strict: false, collection: "trades" }),
    );

  // Pre-pull the Cuequill rows in the symbol+day envelope we need so we
  // don't issue 55 individual queries.
  const symbols = [...new Set(buys.map((b) => b.symbol))];
  const days = [...new Set(buys.map((b) => b.trade_time.slice(0, 10)))];
  const candidates = await Trade.find({
    symbol: { $in: symbols },
    dateBought: {
      $gte: new Date(days[0] + "T00:00:00Z"),
      $lte: new Date(days[days.length - 1] + "T23:59:59Z"),
    },
  }).lean();

  function findMatch(t) {
    const day = t.trade_time.slice(0, 10);
    const candidatesForDay = candidates.filter((c) => {
      if (c.symbol !== t.symbol) return false;
      if (c.qty !== t.size) return false;
      const cb =
        c.dateBought instanceof Date
          ? c.dateBought
          : new Date(c.dateBought);
      return cb.toISOString().slice(0, 10) === day;
    });
    // Prefer a price-match within 1 cent; fall back to first same-day
    // same-symbol same-qty hit.
    const priceMatch = candidatesForDay.find(
      (c) => Math.abs(Number(c.contractPrice) - t.price) <= 0.01,
    );
    return priceMatch ?? candidatesForDay[0] ?? null;
  }

  const rows = buys.map((t) => {
    const m = findMatch(t);
    const d = new Date(t.trade_time);
    return {
      date: t.trade_time.slice(0, 10),
      tzClock: hhmm(minuteOfDayIn(d, TZ)),
      ny: nyClock(d),
      symbol: t.symbol,
      qty: t.size,
      px: t.price,
      option: m ? m.option : "?",
      strategy: m ? (m.strategy ?? "").trim() : "",
      cuequillId: m ? String(m._id) : "",
    };
  });

  const filtered = SHOW_ALL ? rows : rows.filter((r) => r.option === "PUT");
  console.log(
    `${filtered.length} ${SHOW_ALL ? "OPT BUYs" : "PUT entries"} in ${WINDOW} ${TZ} (of ${buys.length} window hits total).\n`,
  );
  console.log(
    `DATE        ${TZ.padEnd(5).slice(0, 5)}   ET     SYMBOL  QTY  PRICE  OPT    CURRENT STRATEGY                      CUEQUILL_ID`,
  );
  console.log("-".repeat(120));
  for (const r of filtered) {
    console.log(
      [
        r.date,
        r.tzClock,
        r.ny,
        r.symbol.padEnd(6),
        String(r.qty).padStart(4),
        r.px.toFixed(2).padStart(6),
        r.option.padEnd(5),
        (r.strategy || "(none)").padEnd(36),
        r.cuequillId,
      ].join("  "),
    );
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
