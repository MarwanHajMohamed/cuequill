import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
    userID: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},

    symbol: {type: String, required: true},
    option: {type: String, enum: ['CALL', 'PUT'], required: true},

    status: {type: String, enum: ['OPEN', 'WIN', 'LOSS'], default: 'OPEN'},
    profitLoss: {type: Number },
    
    spotPrice: {type: Number, required: true},
    contractPrice: {type: Number, required: true},
    qty: {type: Number, required: true},

    strike: {type: Number, required: true},

    dateBought: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    dateClosed: { type: Date },

    closingSpotPrice: {type: Number},
    closingContractPrice: {type: Number},

    strategy: {type: String},
    notes: {type: String}
})

export default mongoose.models.Trade || mongoose.model('Trade', TradeSchema);