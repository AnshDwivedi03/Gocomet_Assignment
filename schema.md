# Database Schema Design

This document details the MongoDB collections and their schemas used in the RFQ (Request for Quotation) system with British Auction dynamics.

## 1. Rfqs Collection (`Rfq`)

Stores the details of the RFQ events, including configuration for the auction.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Unique identifier for the RFQ. |
| `name` | String | Yes | The name or title of the RFQ. |
| `bidStartDate` | Date | Yes | The starting date and time for the auction. |
| `bidCloseDate` | Date | Yes | The initial planned closing date and time. |
| `forcedBidCloseDate`| Date | Yes | The absolute final deadline; the auction cannot be extended past this time. |
| `pickupDate` | Date | No | Expected date for cargo pickup. |
| `status` | String | No | Current state of the RFQ. Enum: `['ACTIVE', 'CLOSED', 'FORCE_CLOSED']`. Default is `ACTIVE`. |
| `triggerWindowMinutes`| Number | Yes | The time window (in minutes) before closing during which a bid can trigger an extension. |
| `extensionDurationMinutes`| Number | Yes | How many minutes the auction is extended by if triggered. |
| `extensionTriggerType`| String | Yes | Rule for extending the auction. Enum: `['ANY_BID', 'ANY_RANK_CHANGE', 'L1_RANK_CHANGE']`. |
| `currentBidCloseDate`| Date | Yes | The actual, dynamic closing date (updated if the auction is extended). |
| `createdAt` | Date | Auto | Timestamp when the RFQ was created. |
| `updatedAt` | Date | Auto | Timestamp when the RFQ was last updated. |

## 2. Bids Collection (`Bid`)

Stores the bids submitted by suppliers for specific RFQs.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Unique identifier for the Bid. |
| `rfqId` | ObjectId | Yes | Reference to the `Rfq` this bid belongs to. |
| `supplierId` | String | Yes | Identifier for the supplier submitting the bid. |
| `carrierName` | String | Yes | Name of the carrier (e.g., Maersk, MSC). |
| `freightCharges`| Number | Yes | Base freight cost. |
| `originCharges` | Number | Yes | Additional charges at the origin. |
| `destinationCharges`| Number | Yes | Additional charges at the destination. |
| `totalAmount` | Number | Yes | Computed sum of freight, origin, and destination charges. |
| `transitTime` | Number | No | Estimated transit time in days. |
| `quoteValidity` | String | No | Validity period of the quote. |
| `createdAt` | Date | Auto | Timestamp when the bid was submitted. |
| `updatedAt` | Date | Auto | Timestamp when the bid was last updated. |

## 3. ActivityLogs Collection (`ActivityLog`)

Tracks significant events within an RFQ for transparency and auditing.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Unique identifier for the log entry. |
| `rfqId` | ObjectId | Yes | Reference to the `Rfq` this event occurred on. |
| `type` | String | Yes | Category of the event. Enum: `['BID_SUBMITTED', 'AUCTION_EXTENDED']`. |
| `description` | String | Yes | Human-readable explanation of the event. |
| `createdAt` | Date | Auto | Timestamp when the event occurred. |
| `updatedAt` | Date | Auto | Timestamp when the log was last updated. |
