import mongoose, { Schema, Document } from "mongoose";

// Pre-launch waitlist entries. Not a real user record - no password,
// no auth. When the app opens up, entries are converted (manually or
// by an admin script) into real User docs and emailed an invite.

export interface IWaitlist extends Document {
  email: string;
  firstname?: string;
  source?: string; // where they signed up from (e.g. "landing", "pricing")
  createdAt: Date;
  invitedAt?: Date;
  // Set once the launch-day "we're open" email has been sent, so the
  // launch-announce cron never emails the same person twice.
  launchEmailedAt?: Date;
}

const WaitlistSchema = new Schema<IWaitlist>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  firstname: { type: String, trim: true },
  source: { type: String, default: "signup" },
  createdAt: { type: Date, default: () => new Date() },
  invitedAt: { type: Date },
  launchEmailedAt: { type: Date },
});

if (process.env.NODE_ENV !== "production" && mongoose.models.Waitlist) {
  mongoose.deleteModel("Waitlist");
}

export const Waitlist =
  mongoose.models.Waitlist ||
  mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);
