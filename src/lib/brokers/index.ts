import type { BrokerAdapter, BrokerId } from "./types";
import { ibkrAdapter } from "./ibkr";
import { tastytradeAdapter } from "./tastytrade";

// Registry of supported brokers. Adding a broker = implement a
// BrokerAdapter and register it here; the sync/import pipeline picks it up.
const ADAPTERS: Record<BrokerId, BrokerAdapter> = {
  ibkr: ibkrAdapter,
  tastytrade: tastytradeAdapter,
};

// The broker assumed when a caller doesn't specify one. IBKR is the
// only integration today, so existing callers keep working unchanged.
export const DEFAULT_BROKER: BrokerId = "ibkr";

export function getBrokerAdapter(id: BrokerId = DEFAULT_BROKER): BrokerAdapter {
  const adapter = ADAPTERS[id];
  if (!adapter) throw new Error(`Unsupported broker: ${id}`);
  return adapter;
}

export type { BrokerAdapter, BrokerId };
