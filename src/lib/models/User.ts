import mongoose, { Schema, Document, models } from "mongoose";

export interface IPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface INotificationPrefs {
  marketOpen: boolean; // 9:30 ET weekdays
  marketClose: boolean; // 16:00 ET weekdays
  eodReminder: boolean; // 16:15 ET — "log today's trades"
  fedWarning: boolean; // morning of FOMC days
  affirmations: boolean; // daily ritual nudge
  affirmationsTime: string; // "HH:MM" in user's tz; default "08:00"
}

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
  pushSubscriptions: IPushSubscription[];
  notificationPrefs: INotificationPrefs;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false },
);

const NotificationPrefsSchema = new Schema<INotificationPrefs>(
  {
    marketOpen: { type: Boolean, default: false },
    marketClose: { type: Boolean, default: false },
    eodReminder: { type: Boolean, default: false },
    fedWarning: { type: Boolean, default: false },
    affirmations: { type: Boolean, default: false },
    affirmationsTime: { type: String, default: "08:00" },
  },
  { _id: false },
);

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
  pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
  notificationPrefs: {
    type: NotificationPrefsSchema,
    default: () => ({}),
  },
});

export const User = models.User || mongoose.model<IUser>("User", UserSchema);
