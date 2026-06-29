const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
    name: { type: String, required: true },
    bidStartDate: { type: Date, required: true },
    bidCloseDate: { type: Date, required: true },
    forcedBidCloseDate: { type: Date, required: true },
    pickupDate: { type: Date, default: null },
    status: {
        type: String,
        default: 'ACTIVE',
        enum: ['ACTIVE', 'CLOSED', 'FORCE_CLOSED'],
    },
    triggerWindowMinutes: { type: Number, required: true },
    extensionDurationMinutes: { type: Number, required: true },
    extensionTriggerType: {
        type: String,
        required: true,
        enum: ['ANY_BID', 'ANY_RANK_CHANGE', 'L1_RANK_CHANGE'],
    },
    currentBidCloseDate: { type: Date, required: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

module.exports = mongoose.model('Rfq', rfqSchema);
