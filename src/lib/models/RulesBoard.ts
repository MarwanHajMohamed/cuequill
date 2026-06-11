import mongoose from "mongoose";

// The rules page is a per-user "board": an ordered list of sections, each
// holding an ordered list of rules. Storing the whole board as one document
// keeps reorganising (reordering sections, moving rules between sections)
// trivial - the client mutates the structure and saves it back in one PUT.

const RuleSub = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
  },
  { _id: false }
);

const SectionSub = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    rules: { type: [RuleSub], default: [] },
  },
  { _id: false }
);

const RulesBoardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    sections: { type: [SectionSub], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.RulesBoard ||
  mongoose.model("RulesBoard", RulesBoardSchema);
