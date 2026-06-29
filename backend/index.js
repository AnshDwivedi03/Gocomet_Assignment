const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./db');
const Rfq = require('./models/Rfq');
const Bid = require('./models/Bid');
const ActivityLog = require('./models/ActivityLog');

const app = express();
app.use(cors());
app.use(express.json());

// --- Serve Frontend in Production ---
// When deployed, the built React app sits in ../frontend/dist
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// Helper: Calculate if a given time is within the trigger window of the close time
const isWithinTriggerWindow = (now, closeDate, triggerWindowMinutes) => {
    const timeDiffMs = closeDate.getTime() - now.getTime();
    const windowMs = triggerWindowMinutes * 60 * 1000;
    return timeDiffMs > 0 && timeDiffMs <= windowMs;
};

// Log activity helper
const logActivity = async (rfqId, type, description) => {
    await ActivityLog.create({ rfqId, type, description });
};

// Create RFQ
app.post('/api/rfqs', async (req, res) => {
    try {
        const {
            name, bidStartDate, bidCloseDate, forcedBidCloseDate, pickupDate,
            triggerWindowMinutes, extensionDurationMinutes, extensionTriggerType
        } = req.body;

        const rfq = await Rfq.create({
            name,
            bidStartDate,
            bidCloseDate,
            forcedBidCloseDate,
            pickupDate: pickupDate || null,
            triggerWindowMinutes,
            extensionDurationMinutes,
            extensionTriggerType,
            currentBidCloseDate: bidCloseDate,
        });

        res.status(201).json({ id: rfq._id, message: 'RFQ Created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create RFQ' });
    }
});

// List all RFQs
app.get('/api/rfqs', async (req, res) => {
    try {
        const rfqs = await Rfq.find().sort({ bidCloseDate: -1 }).lean();
        const now = new Date();

        for (let rfq of rfqs) {
            // Map _id to id for frontend compatibility
            rfq.id = rfq._id;

            // Check status update
            const closeDate = new Date(rfq.currentBidCloseDate);
            if (now > closeDate && rfq.status === 'ACTIVE') {
                rfq.status = (now > new Date(rfq.forcedBidCloseDate)) ? 'FORCE_CLOSED' : 'CLOSED';
                await Rfq.updateOne({ _id: rfq._id }, { status: rfq.status });
            }

            const lowestBid = await Bid.findOne({ rfqId: rfq._id }).sort({ totalAmount: 1 }).lean();
            rfq.lowestBidAmount = lowestBid ? lowestBid.totalAmount : null;
        }

        res.json(rfqs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch RFQs' });
    }
});

// Get RFQ Details
app.get('/api/rfqs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rfq = await Rfq.findById(id).lean();
        if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

        // Map _id to id
        rfq.id = rfq._id;

        const bids = await Bid.find({ rfqId: id }).sort({ totalAmount: 1 }).lean();
        const logs = await ActivityLog.find({ rfqId: id }).sort({ createdAt: -1 }).lean();

        // Map _id to id on nested documents
        bids.forEach(b => { b.id = b._id; });
        logs.forEach(l => { l.id = l._id; });

        res.json({ ...rfq, bids, logs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch RFQ details' });
    }
});

// Submit Bid & Execute British Auction Logic
app.post('/api/rfqs/:id/bids', async (req, res) => {
    try {
        const rfqId = req.params.id;
        const { supplierId, carrierName, freightCharges, originCharges, destinationCharges, transitTime, quoteValidity } = req.body;
        const totalAmount = freightCharges + originCharges + destinationCharges;

        const rfq = await Rfq.findById(rfqId);
        if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

        const now = new Date();
        const currentCloseDate = new Date(rfq.currentBidCloseDate);
        const forcedCloseDate = new Date(rfq.forcedBidCloseDate);

        // Validation
        if (now > currentCloseDate || rfq.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Auction is closed' });
        }

        // Get current bids for ranking calculation (before new bid)
        const currentBids = await Bid.find({ rfqId }).sort({ totalAmount: 1 }).lean();

        // Save the new bid
        const bid = await Bid.create({
            rfqId,
            supplierId,
            carrierName,
            freightCharges,
            originCharges,
            destinationCharges,
            totalAmount,
            transitTime: transitTime || null,
            quoteValidity: quoteValidity || null,
        });

        await logActivity(rfqId, 'BID_SUBMITTED', `Bid placed by ${supplierId} for amount ${totalAmount}`);

        // ================= British Auction Logic =================
        let extendAuction = false;
        let extensionReason = '';

        if (isWithinTriggerWindow(now, currentCloseDate, rfq.triggerWindowMinutes)) {
            // Fetch updated bids to compare
            const newBids = await Bid.find({ rfqId }).sort({ totalAmount: 1 }).lean();

            if (rfq.extensionTriggerType === 'ANY_BID') {
                extendAuction = true;
                extensionReason = 'Bid received within trigger window';
            }
            else if (rfq.extensionTriggerType === 'ANY_RANK_CHANGE') {
                const oldRanks = currentBids.map(b => b.supplierId);
                const newRanks = newBids.map(b => b.supplierId);

                const rankChanged = newRanks.some((supplier, index) => supplier !== oldRanks[index]);
                if (rankChanged || newRanks.length !== oldRanks.length) {
                    extendAuction = true;
                    extensionReason = 'Supplier rank changed within trigger window';
                }
            }
            else if (rfq.extensionTriggerType === 'L1_RANK_CHANGE') {
                const oldL1 = currentBids.length > 0 ? currentBids[0].supplierId : null;
                const newL1 = newBids.length > 0 ? newBids[0].supplierId : null;

                if (oldL1 !== newL1) {
                    extendAuction = true;
                    extensionReason = 'L1 (Lowest Bidder) changed within trigger window';
                }
            }
        }

        // Apply Extension if triggered
        if (extendAuction) {
            let nextCloseDate = new Date(currentCloseDate.getTime() + (rfq.extensionDurationMinutes * 60 * 1000));

            // Ensure we don't exceed forced close date
            if (nextCloseDate > forcedCloseDate) {
                nextCloseDate = forcedCloseDate;
                extensionReason += ' (Capped at Forced Close Time)';
            }

            // Only extend if it's actually pushing the time forward
            if (nextCloseDate > currentCloseDate) {
                await Rfq.updateOne({ _id: rfqId }, { currentBidCloseDate: nextCloseDate });
                await logActivity(rfqId, 'AUCTION_EXTENDED', `Auction extended to ${nextCloseDate.toISOString()}. Reason: ${extensionReason}`);
            }
        }

        res.status(201).json({ id: bid._id, message: 'Bid submitted successfully', extended: extendAuction });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit bid' });
    }
});

// --- Catch-all: serve React app for client-side routing ---
app.get(/.*/, (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(200).send('RFQ System Backend API is running...');
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
