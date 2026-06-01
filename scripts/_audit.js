/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

(function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
})();

const Trade = mongoose.model("Trade", new mongoose.Schema({}, { strict: false, collection: "trades" }));

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const trades = await Trade.find({ simulated: { $ne: true } }).lean();
  const closed = trades.filter((t) => t.status === "WIN" || t.status === "LOSS");
  const grossPL = closed.reduce((s, t) => s + (t.profitLoss ?? 0), 0);
  const totalFees = closed.reduce((s, t) => s + (t.fees ?? 0), 0);
  const netPL = grossPL - totalFees;

  const withIbkr = trades.filter((t) => t.ibkrTradeId).length;
  const withoutIbkr = trades.length - withIbkr;

  console.log("--- Cuequill totals ---");
  console.log(`Total trades:       ${trades.length}`);
  console.log(`  with ibkrTradeId: ${withIbkr}`);
  console.log(`  without:          ${withoutIbkr}`);
  console.log(`Closed trades:      ${closed.length}`);
  console.log(`Gross P/L:          $${grossPL.toFixed(2)}`);
  console.log(`Total fees:         $${totalFees.toFixed(2)}`);
  console.log(`Net P/L:            $${netPL.toFixed(2)}`);

  console.log("\n--- By month ---");
  const byMonth = new Map();
  for (const t of closed) {
    const d = t.dateClosed ? new Date(t.dateClosed) : new Date(t.dateBought);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const prev = byMonth.get(k) ?? { gross: 0, fees: 0, count: 0 };
    prev.gross += t.profitLoss ?? 0;
    prev.fees += t.fees ?? 0;
    prev.count += 1;
    byMonth.set(k, prev);
  }
  const months = [...byMonth.entries()].sort();
  for (const [k, v] of months) {
    console.log(`  ${k}: ${v.count} trades, gross=$${v.gross.toFixed(2)}, fees=$${v.fees.toFixed(2)}, net=$${(v.gross - v.fees).toFixed(2)}`);
  }

  await mongoose.disconnect();
})();
