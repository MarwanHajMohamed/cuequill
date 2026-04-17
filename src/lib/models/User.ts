import mongoose, { Schema, Document, models } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  firstname: string;
  surname: string;
  timezone: string;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  surname: { type: String },
  timezone: { type: String, default: null },
});

export const User = models.User || mongoose.model<IUser>("User", UserSchema);
