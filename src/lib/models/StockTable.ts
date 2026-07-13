import mongoose, { Schema, Document } from "mongoose";
import type { StockRow } from "@/lib/stocksSeed";

export type { StockRow } from "@/lib/stocksSeed";
export { DEFAULT_STOCKS } from "@/lib/stocksSeed";

// One document per user holds their entire Stocks/ETFs reference table.
// The table is a short, hand-curated list the user edits inline, so a
// single doc with an embedded rows array is a better fit than per-row
// documents — the whole thing is read and saved as a unit.
export interface IStockTable extends Document {
  userId: mongoose.Types.ObjectId;
  rows: StockRow[];
  createdAt: Date;
  updatedAt: Date;
}

const StockRowSchema = new Schema<StockRow>(
  {
    id: { type: String, required: true },
    name: { type: String, default: "" },
    cost: { type: String, default: "" },
    volume: { type: String, default: "" },
    distance: { type: String, default: "" },
  },
  { _id: false },
);

const StockTableSchema = new Schema<IStockTable>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    rows: { type: [StockRowSchema], default: [] },
  },
  { timestamps: true },
);

// Drop the hot-reload-cached model in dev so schema edits take effect
// without a full restart (see the same note on the Strategy model).
if (process.env.NODE_ENV !== "production" && mongoose.models.StockTable) {
  mongoose.deleteModel("StockTable");
}

const StockTable =
  (mongoose.models.StockTable as mongoose.Model<IStockTable>) ||
  mongoose.model<IStockTable>("StockTable", StockTableSchema);

export default StockTable;
