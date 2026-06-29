const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
    supplierId: { type: String, required: true },
    carrierName: { type: String, required: true },
    freightCharges: { type: Number, required: true },
    originCharges: { type: Number, required: true },
    destinationCharges: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    transitTime: { type: Number, default: null },
    quoteValidity: { type: String, default: null },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

module.exports = mongoose.model('Bid', bidSchema);
