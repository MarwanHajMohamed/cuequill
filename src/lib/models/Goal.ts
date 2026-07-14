import mongoose, { Schema, Document } from "mongoose";
import type {
  GoalKind,
  GoalMetric,
  GoalTimeframe,
  GoalDirection,
} from "@/lib/goals";

export type {
  GoalKind,
  GoalMetric,
  GoalTimeframe,
  GoalDirection,
} from "@/lib/goals";

// A single user goal — either a metric target auto-tracked against the
// user's trades, or a free-form manual goal they tick off themselves.
export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  kind: GoalKind;
  title: string;
  // metric goals
  metric?: GoalMetric;
  target?: number;
  timeframe?: GoalTimeframe;
  direction?: GoalDirection;
  // manual goals
  done?: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: { type: String, enum: ["metric", "manual"], required: true },
    title: { type: String, default: "" },
    metric: {
      type: String,
      enum: ["net_pl", "win_rate", "trade_count", "profit_factor", "avg_win"],
    },
    target: { type: Number },
    timeframe: {
      type: String,
      enum: ["week", "month", "quarter", "year", "all"],
      default: "month",
    },
    direction: {
      type: String,
      enum: ["at_least", "at_most"],
      default: "at_least",
    },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

GoalSchema.index({ userId: 1, order: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Goal) {
  mongoose.deleteModel("Goal");
}

const Goal =
  (mongoose.models.Goal as mongoose.Model<IGoal>) ||
  mongoose.model<IGoal>("Goal", GoalSchema);

export default Goal;
