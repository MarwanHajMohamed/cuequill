// Shared type for the per-user Stocks/ETFs reference table. Lives in
// lib (not the Mongoose model) so client code can import it without
// dragging Mongoose into the browser bundle - same split as
// strategyConstants.
//
// New accounts now start with an empty table; users add symbols
// themselves.

export type StockRow = {
  // Stable client/server id so rows keep their identity across edits
  // (the ticker name is editable and can briefly duplicate, so it
  // can't be the key).
  id: string;
  name: string;
  cost: string;
  volume: string;
  distance: string;
};
