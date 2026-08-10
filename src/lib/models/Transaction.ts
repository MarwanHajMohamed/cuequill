import mongoose, { Schema, Document, models } from "mongoose";

// Transactions
export interface ITransaction extends Document {
  userID: mongoose.Types.ObjectId;
  // DEPOSIT / WITHDRAW store a positive amount; ADJUST is a balance
  // reconciliation whose amount is the SIGNED correction (+/-) that snaps the
  // running balance to the user's actual broker balance.
  type: "DEPOSIT" | "WITHDRAW" | "ADJUST";
  amount: number;
  date: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["DEPOSIT", "WITHDRAW", "ADJUST"], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

export const Transaction =
  models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
