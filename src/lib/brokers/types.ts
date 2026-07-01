import type { NormalizedFill } from "@/lib/ibkr/match";

// Identifier for a supported broker. Add new brokers here as adapters
// are implemented, then register them in ./index.
export type BrokerId = "ibkr" | "tastytrade";

// How a broker's trades get into the app:
//   "pull" — fetched from the broker's API using stored credentials
//            (supports automatic/scheduled sync, e.g. IBKR Flex).
//   "file" — the user exports a statement and uploads it (no creds, no
//            scheduled sync), e.g. a Tastytrade transaction CSV.
export type BrokerMode = "pull" | "file";

// A broker adapter is the *only* broker-specific part of the import
// pipeline. Its job is to turn the user's executions into
// `NormalizedFill[]`. Everything downstream — FIFO matching into
// round-trip trades, dedupe, insert, sync status — is shared and
// broker-agnostic (see lib/ibkrSync).
//
// Pull adapters implement `fetchFills`; file adapters implement
// `parseFills`. The matching `mode` says which to expect.
export interface BrokerAdapter {
  id: BrokerId;
  // Human-readable name for UI ("Interactive Brokers").
  label: string;
  mode: BrokerMode;
  // Pull mode: fetch + normalize the user's fills using stored creds.
  // Throws a descriptive Error when credentials are missing or the
  // request fails; the error may carry a `code` (e.g. "RATE_LIMITED").
  fetchFills?(userId: string): Promise<NormalizedFill[]>;
  // File mode: parse + normalize the contents of an exported statement.
  // Pure (no I/O) so it can be unit-tested without an account.
  parseFills?(content: string): NormalizedFill[];
}
