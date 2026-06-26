import mongoose, { Schema, Document, models } from "mongoose";
import type {
  Schematic,
  SchematicElement,
} from "@/lib/strategyConstants";

// A user-owned custom strategy. The schematic is a small SVG-ish
// scene the user composes by dragging candles, lines, arrows, zones,
// and text labels around a canvas. We keep it as an opaque elements
// array so adding new tools later doesn't require a migration.
//
// Shared types and constants live in lib/strategyConstants so client
// code can import them without dragging Mongoose into the browser
// bundle.
export type { SchematicKind, SchematicElement, Schematic } from "@/lib/strategyConstants";
export {
  FREE_STRATEGY_LIMIT,
  SEED_STRATEGIES,
} from "@/lib/strategyConstants";

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

