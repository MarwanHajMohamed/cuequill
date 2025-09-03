import mongoose, { Schema, Document, models } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
});

export const User = models.User || mongoose.model<IUser>("User", UserSchema);
