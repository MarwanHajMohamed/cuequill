import mongoose, { Schema, Document, models } from "mongoose";

// A single point on the account-balance timeline: the account's total
// value (NAV) on a given calendar day. Two sources feed the same
// timeline — daily NAV pulled from IBKR's Flex "Equity Summary in Base"
// section, and manual snapshots the user enters by hand (for other
// accounts, backfilling, or corrections).
export interface IBalanceSnapshot extends Document {
  userID: mongoose.Types.ObjectId;
  date: string; // yyyy-MM-dd — the day this balance is for
  balance: number; // account value in `currency`
  currency?: string; // ISO code, e.g. "USD" / "GBP"; optional
  source: "ibkr" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

const BalanceSnapshotSchema = new Schema<IBalanceSnapshot>(
  {
    userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    balance: { type: Number, required: true },
    currency: { type: String },
    source: { type: String, enum: ["ibkr", "manual"], required: true },
  },
  { timestamps: true },
);

// One balance per user per day. A later write — a manual correction or a
// fresh IBKR pull — upserts the same (userID, date) doc rather than
// stacking duplicates.
BalanceSnapshotSchema.index({ userID: 1, date: 1 }, { unique: true });

export const BalanceSnapshot =
  models.BalanceSnapshot ||
  mongoose.model<IBalanceSnapshot>("BalanceSnapshot", BalanceSnapshotSchema);

export default BalanceSnapshot;
