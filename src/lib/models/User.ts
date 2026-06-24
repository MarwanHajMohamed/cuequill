import mongoose, { Schema, Document, models } from "mongoose";

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
  ibkrLastSyncTradeIds: [{ type: Schema.Types.ObjectId, ref: "Trade", default: [] }],
  watchlist: { type: [String], default: [] },
});

export const User = models.User || mongoose.model<IUser>("User", UserSchema);
