import mongoose, { Schema, Document } from "mongoose";
import type { BacktestConfig } from "@/lib/backtest/types";

// A saved backtest: just a name + the config. Results are recomputed on
// load (the engine is fast and runs client-side), so nothing stale is
// stored. Config is opaque (Mixed) so evolving the rule model needs no
// migration.
export interface IBacktest extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  config: BacktestConfig;
  createdAt: Date;
  updatedAt: Date;
}

const BacktestSchema = new Schema<IBacktest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Backtest) {
  mongoose.deleteModel("Backtest");
}

export const Backtest =
  (mongoose.models.Backtest as mongoose.Model<IBacktest>) ||
  mongoose.model<IBacktest>("Backtest", BacktestSchema);
