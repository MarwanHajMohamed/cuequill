import mongoose from "mongoose";

// User-defined trading rules. The page also shows a set of hardcoded
// default rules; these are the custom ones a user adds on top, split by
// category into the two sections ("when" = trading windows, "how" =
// position rules).
const RuleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String },
    category: {
      type: String,
      enum: ["when", "how"],
      default: "how",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Rule || mongoose.model("Rule", RuleSchema);
