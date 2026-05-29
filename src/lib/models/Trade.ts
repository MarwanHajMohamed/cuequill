import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  symbol: { type: String, required: true },
  option: { type: String, enum: ["CALL", "PUT"], required: true },

  status: { type: String, enum: ["OPEN", "WIN", "LOSS"], default: "OPEN" },
  profitLoss: { type: Number },
  // Total commissions/fees (entry + exit), in USD. Subtracted from
  // profitLoss to compute net P/L.
  fees: { type: Number, default: 0 },

  contractPrice: { type: Number, required: true },
  qty: { type: Number, required: true },

  strike: { type: Number, required: true },

  dateBought: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  dateClosed: { type: Date },

  closingContractPrice: { type: Number },

  simulated: { type: Boolean, required: true },
  favourite: { type: Boolean, default: false },

  strategy: { type: String },
  notes: { type: String },
  tags: { type: [String], default: [] },

  ibkrTradeId: { type: String, sparse: true },
});

export default mongoose.models.Trade || mongoose.model("Trade", TradeSchema);
