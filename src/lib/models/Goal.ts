import mongoose from "mongoose";

const GoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    goal: { type: String, required: true },
    complete: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Goal || mongoose.model("Goal", GoalSchema);
