const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
    type: {
        type: String,
        required: true,
        enum: ['BID_SUBMITTED', 'AUCTION_EXTENDED'],
    },
    description: { type: String, required: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
