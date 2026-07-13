// Shared types + default seed for the per-user Stocks/ETFs reference
// table. Lives in lib (not the Mongoose model) so client code can import
// the type and the seed without dragging Mongoose into the browser
// bundle — same split as strategyConstants.

export type StockRow = {
  // Stable client/server id so rows keep their identity across edits
  // (the ticker name is editable and can briefly duplicate, so it can't
  // be the key).
  id: string;
  name: string;
  cost: string;
  volume: string;
  distance: string;
};

// The original hard-coded list. Each new account's table is seeded from
// this on first load; users edit freely from there.
export const DEFAULT_STOCKS: Omit<StockRow, "id">[] = [
  { name: "SPY", cost: "0.25 – 0.30", volume: "20", distance: "10" },
  { name: "QQQ", cost: "0.25 – 0.30", volume: "20", distance: "10" },
  { name: "TNA", cost: "0.60 – 0.80", volume: "2", distance: "8 – 13" },
  { name: "AAPL", cost: "0.45 – 0.80", volume: "20 – 25", distance: "2 – 4" },
  { name: "META", cost: "0.45 – 0.80", volume: "3", distance: "20 – 25" },
  { name: "AMZN", cost: "0.60 – 0.80", volume: "16", distance: "7 – 8" },
  { name: "NFLX", cost: "1.50 – 2.50", volume: "1", distance: "12 – 15" },
  { name: "TSLA", cost: "2.50", volume: "15", distance: "8 – 10" },
  { name: "NVDA", cost: "0.60 – 0.80", volume: "120", distance: "6 – 9" },
  { name: "MRNA", cost: "1.0 – 2.0", volume: "2", distance: "12 – 15" },
  { name: "GLD", cost: "0.60 – 0.80", volume: "2", distance: "2 – 4" },
  { name: "SLV", cost: "0.10 – 0.20", volume: "10", distance: "1 – 2" },
  { name: "USO", cost: "0.10 – 0.20", volume: "1", distance: "2 – 3" },
  { name: "BAC", cost: "0.10 – 0.20", volume: "10", distance: "1 – 2" },
  { name: "CVX", cost: "0.60 – 0.80", volume: "2", distance: "3 – 5" },
  { name: "XOM", cost: "0.60 – 0.80", volume: "4", distance: "3 – 5" },
];
