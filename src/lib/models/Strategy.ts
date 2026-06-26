import mongoose, { Schema, Document, models } from "mongoose";

// A user-owned custom strategy. The schematic is a small SVG-ish
// scene the user composes by dragging candles, lines, arrows, zones,
// and text labels around a canvas. We keep it as an opaque elements
// array so adding new tools later doesn't require a migration.

export type SchematicKind = "candle" | "line" | "arrow" | "zone" | "text";

export interface SchematicElement {
  id: string;
  kind: SchematicKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  bull?: boolean;
  text?: string;
  color?: string;
  label?: string;
}

export interface Schematic {
  width: number;
  height: number;
  elements: SchematicElement[];
}

export interface IStrategy extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  direction: "CALL" | "PUT";
  timeframes: string[];
  description: string;
  tags: string[];
  schematic: Schematic;
  createdAt: Date;
  updatedAt: Date;
}

const SchematicElementSchema = new Schema<SchematicElement>(
  {
    id: { type: String, required: true },
    kind: {
      type: String,
      enum: ["candle", "line", "arrow", "zone", "text"],
      required: true,
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number },
    h: { type: Number },
    x2: { type: Number },
    y2: { type: Number },
    bull: { type: Boolean },
    text: { type: String },
    color: { type: String },
    label: { type: String },
  },
  { _id: false },
);

const SchematicSchema = new Schema<Schematic>(
  {
    width: { type: Number, default: 800 },
    height: { type: Number, default: 480 },
    elements: { type: [SchematicElementSchema], default: [] },
  },
  { _id: false },
);

const StrategySchema = new Schema<IStrategy>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    direction: { type: String, enum: ["CALL", "PUT"], required: true },
    timeframes: { type: [String], default: [] },
    description: { type: String, default: "" },
    tags: { type: [String], default: [] },
    schematic: {
      type: SchematicSchema,
      default: () => ({ width: 800, height: 480, elements: [] }),
    },
  },
  { timestamps: true },
);

// One strategy name per user. Case-insensitive collation keeps "Hard
// Floor" and "hard floor" from coexisting.
StrategySchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

const Strategy =
  (models.Strategy as mongoose.Model<IStrategy>) ||
  mongoose.model<IStrategy>("Strategy", StrategySchema);

export default Strategy;

// Names + directions used to seed a brand-new user's library so the
// trade-strategy picker isn't empty on day one. These mirror the old
// static library so existing flows keep working.
export const SEED_STRATEGIES: {
  name: string;
  direction: "CALL" | "PUT";
  timeframes: string[];
}[] = [
  { name: "Moving Average 40", direction: "CALL", timeframes: ["Hourly"] },
  { name: "Normal Fall & Hard Fall", direction: "CALL", timeframes: ["Daily"] },
  { name: "Bearish Channel Break", direction: "CALL", timeframes: ["Daily"] },
  { name: "Normal Bullish Gap", direction: "CALL", timeframes: ["Daily"] },
  { name: "Bearish Gap Uptrend", direction: "CALL", timeframes: ["Daily"] },
  { name: "Hard Floor", direction: "CALL", timeframes: ["Daily"] },
  { name: "The First Uptrend Gap", direction: "CALL", timeframes: ["Daily"] },
  { name: "First Red Opening Candle", direction: "PUT", timeframes: ["Hourly"] },
  { name: "Gap Floor Break", direction: "PUT", timeframes: ["Daily"] },
  { name: "Model of 4 Steps", direction: "PUT", timeframes: ["Daily"] },
  { name: "Hanger in Daily", direction: "PUT", timeframes: ["Daily"] },
];

export const FREE_STRATEGY_LIMIT = 3;
