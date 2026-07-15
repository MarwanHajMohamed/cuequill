import mongoose, { Schema, Document } from "mongoose";
import type { Bar } from "@/lib/backtest/types";

// Server-side cache of daily OHLC bars per symbol so backtests rerun
// instantly and we don't hammer the data provider. Refreshed lazily when
// the cached copy is older than the TTL (see the prices route).
export interface IPriceCache extends Document {
  symbol: string; // uppercase, no suffix
  bars: Bar[];
  fetchedAt: Date;
}

const BarSchema = new Schema<Bar>(
  {
    date: { type: String, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, default: 0 },
  },
  { _id: false },
);

const PriceCacheSchema = new Schema<IPriceCache>({
  symbol: { type: String, required: true, unique: true, index: true },
  bars: { type: [BarSchema], default: [] },
  fetchedAt: { type: Date, default: () => new Date() },
});

if (process.env.NODE_ENV !== "production" && mongoose.models.PriceCache) {
  mongoose.deleteModel("PriceCache");
}

export const PriceCache =
  (mongoose.models.PriceCache as mongoose.Model<IPriceCache>) ||
  mongoose.model<IPriceCache>("PriceCache", PriceCacheSchema);
