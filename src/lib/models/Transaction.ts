import mongoose, { Schema, Document, models } from "mongoose";

export interface ITransaction extends Document {
  userID: mongoose.Types.ObjectId;
  type: "DEPOSIT" | "WITHDRAW";
  amount: number;
  date: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["DEPOSIT", "WITHDRAW"], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

export const Transaction =
  models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
