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
  // Last time the user acknowledged the auto-sync notice. When null or
  // older than `ibkrLastSync` AND the last sync inserted rows, the
  // client shows a "new trades imported automatically" pop-up on the
  // next login. Updated once the user dismisses or opens the notice.
  ibkrLastSyncSeenAt?: Date;
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
  // Send a daily 8am (local) email reminder if the user hasn't
  // read all their affirmations yet that day. Opt-out; on by default.
  emailAffirmationsReminder?: boolean;
  // Local-date (yyyy-MM-dd, in the user's tz) of the last reminder
  // sent, so the hourly cron doesn't spam the same person more than
  // once a day.
  emailAffirmationsLastSentDate?: string;
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
  ibkrLastSyncSeenAt: { type: Date },
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
  emailAffirmationsReminder: { type: Boolean, default: true },
  emailAffirmationsLastSentDate: { type: String, default: "" },
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
