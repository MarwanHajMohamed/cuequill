import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  // Account lockout counters, incremented by the sign-in flow. The
  // `authorize` callback rejects logins while `lockedUntil` is in the
  // future so a single account can't be brute-forced even without
  // shared rate-limiting infrastructure.
  failedLoginAttempts?: number;
  lockedUntil?: Date;
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
  // Pro membership flag — the effective, computed access gate. Gates
  // Quill AI, IBKR auto-sync, the rules board / affirmations,
  // per-strategy + per-symbol stats, and unlimited trade history. Free
  // users see blurred previews behind an upgrade prompt.
  //
  // Written by the Stripe webhook as `proManualOverride || <subscription
  // is active/trialing>`, so it stays true for comped accounts even with
  // no subscription, and flips false when a subscription lapses.
  isPro: boolean;
  // Admin comp: when true, the account is Pro regardless of billing. The
  // Stripe webhook never clears this — it only ORs it into isPro — so a
  // manually-granted account can't be revoked by a subscription event.
  proManualOverride?: boolean;
  // Stripe billing linkage. stripeCustomerId is the lookup key the
  // webhook uses to map an incoming event back to a user.
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Raw Stripe subscription status: active, trialing, past_due, canceled,
  // incomplete, unpaid, etc. Kept so the UI can explain WHY access
  // changed (e.g. "payment failed") without re-querying Stripe.
  stripeSubscriptionStatus?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: Date;
  // Send a daily 8am (local) email reminder if the user hasn't
  // read all their affirmations yet that day. Opt-out; on by default.
  emailAffirmationsReminder?: boolean;
  // Local-date (yyyy-MM-dd, in the user's tz) of the last reminder
  // sent, so the hourly cron doesn't spam the same person more than
  // once a day.
  emailAffirmationsLastSentDate?: string;
}

const UserSchema = new Schema<IUser>({
  // lowercase+trim so a user who signs up as "Marwan@…" and later
  // types "marwan@…" logs in successfully, and the `unique` index
  // treats them as the same address.
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  // select:false → the hash is never returned by default queries.
  // The two callsites that legitimately need it (sign-in verification
  // and password change) opt in with `.select("+password")`.
  password: { type: String, required: true, select: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
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
  proManualOverride: { type: Boolean, default: false },
  // Indexed: the Stripe webhook finds the user by customer id on every
  // subscription event.
  stripeCustomerId: { type: String, index: true },
  stripeSubscriptionId: { type: String },
  stripeSubscriptionStatus: { type: String },
  stripePriceId: { type: String },
  stripeCurrentPeriodEnd: { type: Date },
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
