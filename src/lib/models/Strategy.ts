import mongoose, { Schema, Document } from "mongoose";
import type { Schematic, SchematicElement } from "@/lib/strategyConstants";
import type { StrategyExample, StrategyVideo } from "@/lib/strategySeed";

// A user-owned custom strategy. The schematic is a small SVG-ish
// scene the user composes by dragging candles, lines, arrows, zones,
// and text labels around a canvas. We keep it as an opaque elements
// array so adding new tools later doesn't require a migration.
//
// Shared types and constants live in lib/strategyConstants so client
// code can import them without dragging Mongoose into the browser
// bundle.
export type {
  SchematicKind,
  SchematicElement,
  Schematic,
} from "@/lib/strategyConstants";
export { FREE_STRATEGY_LIMIT, SEED_STRATEGIES } from "@/lib/strategyConstants";

export interface IStrategy extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  // "BOTH" = the setup applies to both CALL and PUT trades; it shows in both
  // direction columns and is selectable on trades of either side.
  direction: "CALL" | "PUT" | "BOTH";
  timeframes: string[];
  // Rich-text HTML (RichNotesEditor format) — prose, lists, and inline
  // images describing the setup.
  description: string;
  tags: string[];
  schematic: Schematic;
  // User-uploaded chart examples, labelled by outcome. Images are
  // stored inline as data URLs (or /public paths for seeded content),
  // mirroring how trade-note images are persisted.
  examples: StrategyExample[];
  // User-uploaded videos (a per-strategy "folder"). Bytes live in Vercel
  // Blob; only metadata is stored here.
  videos: StrategyVideo[];
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
    wickUp: { type: Number },
    wickDown: { type: Number },
    appearAt: { type: Number },
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

const ExampleSchema = new Schema<StrategyExample>(
  {
    id: { type: String, required: true },
    src: { type: String, required: true },
    outcome: {
      type: String,
      enum: ["Successful", "Unsuccessful"],
      required: true,
    },
    caption: { type: String },
  },
  { _id: false },
);

const VideoSchema = new Schema<StrategyVideo>(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number },
    contentType: { type: String },
    uploadedAt: { type: String, required: true },
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
    direction: { type: String, enum: ["CALL", "PUT", "BOTH"], required: true },
    timeframes: { type: [String], default: [] },
    description: { type: String, default: "" },
    tags: { type: [String], default: [] },
    schematic: {
      type: SchematicSchema,
      default: () => ({ width: 800, height: 480, elements: [] }),
    },
    examples: { type: [ExampleSchema], default: [] },
    videos: { type: [VideoSchema], default: [] },
  },
  { timestamps: true },
);

// One strategy name per user. Case-insensitive collation keeps "Hard
// Floor" and "hard floor" from coexisting.
StrategySchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

// In dev, Next.js hot-reload keeps the previously-compiled model (with
// its old schema) registered on the global mongoose singleton, so schema
// edits silently stop persisting — strict mode strips paths the stale
// schema doesn't know about (e.g. a newly added `examples`). Drop the
// cached model so it recompiles with the current schema. In production
// the module is evaluated once, so this is a no-op.
if (process.env.NODE_ENV !== "production" && mongoose.models.Strategy) {
  mongoose.deleteModel("Strategy");
}

const Strategy =
  (mongoose.models.Strategy as mongoose.Model<IStrategy>) ||
  mongoose.model<IStrategy>("Strategy", StrategySchema);

export default Strategy;
