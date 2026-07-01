import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  firstname: string;
  surname: string;
  timezone: string;
  ibkrToken: string;
  ibkrQueryId: string;
  ibkrLastSync: Date;
  ibkrLastSyncInserted: number;
  ibkrLastSyncSkipped: number;
  // ObjectIds of the trades inserted by the most recent sync. Used by
  // the settings UI to show what was imported and let the user delete
  // any duplicates the dedupe pass didn't catch.
  ibkrLastSyncTradeIds: mongoose.Types.ObjectId[];
  // Tickers the user tracks on the earnings calendar.
  watchlist: string[];
  // User-authored trading affirmations (Pro). Empty by default; users
  // add their own on the affirmations page.
  affirmations: string[];
  // Which affirmations have been marked read, scoped to a day so it
  // resets daily. Stored server-side so the state syncs across devices.
  // `date` is a yyyy-MM-dd string; `texts` are the read affirmations.
  affirmationsRead: { date: string; texts: string[] };
  // Pro membership flag. Gates Quill AI, IBKR auto-sync, the rules
  // board / affirmations, per-strategy + per-symbol stats, and
  // unlimited trade history. Free users see blurred previews behind
  // an upgrade prompt. Flipped manually until a real billing
  // integration ships.
  isPro: boolean;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  surname: { type: String },
  timezone: { type: String, default: null },
  ibkrToken: { type: String },
  ibkrQueryId: { type: String },
  ibkrLastSync: { type: Date },
  ibkrLastSyncInserted: { type: Number },
  ibkrLastSyncSkipped: { type: Number },
  ibkrLastSyncTradeIds: [
    { type: Schema.Types.ObjectId, ref: "Trade", default: [] },
  ],
  watchlist: { type: [String], default: [] },
  affirmations: { type: [String], default: [] },
  affirmationsRead: {
    type: new Schema(
      {
        date: { type: String, default: "" },
        texts: { type: [String], default: [] },
      },
      { _id: false },
    ),
    default: () => ({ date: "", texts: [] }),
  },
  isPro: { type: Boolean, default: false },
});

// In dev, Next.js hot-reload keeps the previously-compiled model (with
// its old schema) registered on the global mongoose singleton, so newly
// added fields silently stop persisting (strict mode strips unknown
// paths). Drop the cached model so it recompiles with the current
// schema. In production the module is evaluated once, so it's a no-op.
if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
  mongoose.deleteModel("User");
}

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
