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
});

export const User = models.User || mongoose.model<IUser>("User", UserSchema);
