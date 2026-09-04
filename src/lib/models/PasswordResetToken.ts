import mongoose, { Schema, Document } from "mongoose";

// Single-use password-reset tokens. We store only a SHA-256 hash of the
// token (never the raw value), so a database leak can't be used to reset
// anyone's password - the raw token exists only in the emailed link.
// A TTL index on `expiresAt` lets Mongo auto-purge expired rows, and each
// reset invalidates the user's previous tokens (deleteMany then create).

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  // TTL: Mongo removes the document once `expiresAt` passes.
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
});

if (
  process.env.NODE_ENV !== "production" &&
  mongoose.models.PasswordResetToken
) {
  mongoose.deleteModel("PasswordResetToken");
}

export const PasswordResetToken =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>(
    "PasswordResetToken",
    PasswordResetTokenSchema,
  );
