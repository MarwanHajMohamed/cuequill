import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  // Optional: OAuth-only accounts (e.g. Sign up with Google) have no
  // password. Credentials login is blocked for such users (see auth.ts).
  password?: string;
  // Account lockout counters, incremented by the sign-in flow. The
  // `authorize` callback rejects logins while `lockedUntil` is in the
  // future so a single account can't be brute-forced even without
  // shared rate-limiting infrastructure.
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  // Pre-launch lock: set at signup to the public launch date. While this
  // is in the future the account exists but can't sign in (or auto-login).
  // Cleared implicitly by time - once the date passes it no longer blocks.
  // Accounts created without it (owner, comps, testers) are never gated.
  preLaunchLockUntil?: Date;
  firstname: string;
  surname: string;
  timezone: string;
  // Display preferences. `currency` is a 3-letter ISO code used only to
  // pick the money symbol app-wide (no FX conversion). `startingBalance`
  // anchors the Balance page; `riskPerTrade` is a % of account risked per
  // trade; `avatarColor` is a preset key for the nav avatar.
  currency?: string;
  startingBalance?: number;
  riskPerTrade?: number;
  avatarColor?: string;
  avatarFrame?: string;
  // App-wide accent pack id (recolours teal→accent across the UI). A
  // level-gated reward; defaults to "teal".
  accentColor?: string;
  // Default share-card skin id (trade / month / achievement cards). A
  // level-gated reward; defaults to "midnight".
  cardSkin?: string;
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
  // Affirmations streak. A day counts as complete when the user has read
  // ALL of their current affirmations that day. `current` is the length of
  // the latest run and `lastDate` (yyyy-MM-dd, client-local) is the most
  // recent completed day; a run stays "alive" while lastDate is today or
  // yesterday, otherwise it's considered broken (see the read route). Once a
  // day is completed, un-reading later that day does not revoke it.
  affirmationStreak: { current: number; longest: number; lastDate: string };
  // High-water mark: the best streak length (days) for which streak XP
  // milestones have already been awarded, so each milestone pays out once.
  affirmationStreakXp?: number;
  // Pro membership flag - the effective, computed access gate. Gates
  // Quill AI, IBKR auto-sync, the rules board / affirmations,
  // per-strategy + per-symbol stats, and unlimited trade history. Free
  // users see blurred previews behind an upgrade prompt.
  //
  // Written by the Stripe webhook as `proManualOverride || <subscription
  // is active/trialing>`, so it stays true for comped accounts even with
  // no subscription, and flips false when a subscription lapses.
  isPro: boolean;
  // Admin comp: when true, the account is Pro regardless of billing. The
  // Stripe webhook never clears this - it only ORs it into isPro - so a
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
  // Last time we reconciled this user's Pro status live from Stripe (used
  // to self-heal a missed webhook). Throttles the reconcile so a genuinely
  // non-Pro account with a Stripe customer id isn't re-checked every call.
  proSyncedAt?: Date;
  // True once the user has cancelled but the paid term hasn't elapsed -
  // access continues until stripeCurrentPeriodEnd, then the subscription
  // ends. Lets the UI show "cancels on <date>" instead of a bare "Pro".
  stripeCancelAtPeriodEnd?: boolean;
  // Quill AI per-user fair-use counters. Reset lazily when the stored
  // day/month key differs from the current one (no cron needed).
  chatDailyDate?: string; // yyyy-MM-dd (UTC) the daily count belongs to
  chatDailyCount?: number; // messages sent that day
  chatMonth?: string; // yyyy-MM (UTC) the token total belongs to
  chatMonthTokens?: number; // Gemini tokens consumed that month
  // Send a daily 8am (local) email reminder if the user hasn't
  // read all their affirmations yet that day. Opt-out; on by default.
  emailAffirmationsReminder?: boolean;
  // Local-date (yyyy-MM-dd, in the user's tz) of the last reminder
  // sent, so the hourly cron doesn't spam the same person more than
  // once a day.
  emailAffirmationsLastSentDate?: string;
  // Customisable dashboard: ordered list of enabled widget ids. Empty /
  // unset means "use the client default layout". Validated client-side
  // against the widget registry before render.
  dashboardLayout?: string[];
  // Ordered list of enabled stat-tile ids inside the "At a glance" widget
  // (Today, This week, All-time P/L, …). Same contract as dashboardLayout.
  dashboardGlanceTiles?: string[];
  // Per-widget column span (1 = half width, 2 = full width) keyed by
  // widget id. Missing id → default span of 1.
  dashboardWidgetSizes?: Record<string, number>;
  // Per-widget row span (1 = one row tall, 2 = two rows tall) keyed by
  // widget id. Missing id → default span of 1.
  dashboardWidgetRows?: Record<string, number>;
  // Cached "Insight of the day" for the dashboard Quill widget. Generated
  // once per local day (see dashInsightDate) so it stays stable through the
  // day and doesn't burn the Quill token budget on every dashboard load.
  dashInsightDate?: string; // yyyy-MM-dd (user's tz) the insight belongs to
  dashInsightText?: string;
  dashInsightAt?: Date; // when it was generated
  // Ring buffer of the most recent insights (newest first, bounded to
  // ~14 entries). Injected into the prompt as an "avoid repeating"
  // list so QuillAI doesn't keep surfacing the same observation two
  // days running.
  dashInsightRecent?: string[];
  // One-time flag: the "Insight of the day" widget has been auto-inserted
  // into this (Pro) user's saved layout, so we never fight a later manual
  // removal by re-adding it.
  dashInsightMigrated?: boolean;
  // One-time flag: the "Balance" widget has been auto-inserted into this
  // user's saved layout, so we never fight a later manual removal.
  dashBalanceMigrated?: boolean;
  dashChallengesMigrated?: boolean;
  // Challenges & rewards. `xp` accumulates from claimed challenges and
  // drives the level/title; `challengeClaims` records which challenges
  // have been claimed (each awards its XP exactly once).
  xp?: number;
  challengeClaims?: { id: string; claimedAt: Date }[];
  // Bonus Quill AI messages earned from level-up rewards - a finite pool
  // consumed once the daily message limit is hit.
  bonusChatMessages?: number;
  // Customisable Quill AI starter-prompt shortcuts shown on the empty
  // chat state. Unset means "use the client defaults"; an empty array
  // means the user cleared them all. Each entry is a labelled one-tap
  // prompt.
  chatPrompts?: { id: string; icon: string; title: string; prompt: string }[];
  // Gemini context-cache registry for Quill. The big, stable system
  // instruction (trader snapshot + rules + strategies + goals) is cached
  // server-side so multi-turn chats on an unchanged journal don't re-send /
  // re-bill it every message. `chatCacheHash` is a hash of the cached
  // instruction so we recreate the cache when the snapshot changes.
  chatCacheName?: string;
  chatCacheHash?: string;
  chatCacheExpiresAt?: Date;
  // High-water mark: the highest level for which level-up chat rewards have
  // already been granted, so reaching a level pays out exactly once.
  chatRewardLevel?: number;
  // The title the user has chosen to display as a nameplate next to their
  // name. Must be one of their earned titles (current level title or a
  // title granted by an earned trophy); purely cosmetic.
  equippedTitle?: string;
  // Leaderboard participation. Off by default (opt-in): only when true does
  // the user appear on the public leaderboards, shown as first name + last
  // initial. Ranking metrics (level/XP, trades, streak) are all process /
  // discipline based - never P/L.
  leaderboardOptIn?: boolean;
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
  password: { type: String, required: false, select: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  preLaunchLockUntil: { type: Date },
  firstname: { type: String, required: true },
  surname: { type: String },
  timezone: { type: String, default: null },
  currency: { type: String, default: "USD" },
  startingBalance: { type: Number, default: 0 },
  riskPerTrade: { type: Number },
  avatarColor: { type: String, default: "teal" },
  avatarFrame: { type: String, default: "none" },
  accentColor: { type: String, default: "teal" },
  cardSkin: { type: String, default: "midnight" },
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
  affirmationStreak: {
    type: new Schema(
      {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastDate: { type: String, default: "" },
      },
      { _id: false },
    ),
    default: () => ({ current: 0, longest: 0, lastDate: "" }),
  },
  affirmationStreakXp: { type: Number, default: 0 },
  isPro: { type: Boolean, default: false },
  proManualOverride: { type: Boolean, default: false },
  // Indexed: the Stripe webhook finds the user by customer id on every
  // subscription event.
  stripeCustomerId: { type: String, index: true },
  stripeSubscriptionId: { type: String },
  stripeSubscriptionStatus: { type: String },
  stripePriceId: { type: String },
  stripeCurrentPeriodEnd: { type: Date },
  proSyncedAt: { type: Date },
  stripeCancelAtPeriodEnd: { type: Boolean, default: false },
  chatDailyDate: { type: String, default: "" },
  chatDailyCount: { type: Number, default: 0 },
  chatMonth: { type: String, default: "" },
  chatMonthTokens: { type: Number, default: 0 },
  emailAffirmationsReminder: { type: Boolean, default: true },
  emailAffirmationsLastSentDate: { type: String, default: "" },
  dashboardLayout: { type: [String], default: undefined },
  dashboardGlanceTiles: { type: [String], default: undefined },
  dashboardWidgetSizes: { type: Schema.Types.Mixed, default: undefined },
  dashboardWidgetRows: { type: Schema.Types.Mixed, default: undefined },
  dashInsightDate: { type: String, default: "" },
  dashInsightText: { type: String, default: "" },
  dashInsightAt: { type: Date },
  dashInsightRecent: { type: [String], default: [] },
  dashInsightMigrated: { type: Boolean, default: false },
  dashBalanceMigrated: { type: Boolean, default: false },
  dashChallengesMigrated: { type: Boolean, default: false },
  xp: { type: Number, default: 0 },
  bonusChatMessages: { type: Number, default: 0 },
  chatPrompts: {
    type: [
      new Schema(
        {
          id: { type: String },
          icon: { type: String, default: "fa-solid fa-bolt" },
          title: { type: String },
          prompt: { type: String },
        },
        { _id: false },
      ),
    ],
    default: undefined,
  },
  chatCacheName: { type: String, default: "" },
  chatCacheHash: { type: String, default: "" },
  chatCacheExpiresAt: { type: Date },
  chatRewardLevel: { type: Number, default: 0 },
  equippedTitle: { type: String, default: "" },
  leaderboardOptIn: { type: Boolean, default: false },
  challengeClaims: {
    type: [
      new Schema(
        { id: { type: String }, claimedAt: { type: Date, default: Date.now } },
        { _id: false },
      ),
    ],
    default: [],
  },
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
