# High-Level Design (HLD): British Auction RFQ System

## 1. System Overview
The system is a full-stack web application designed to manage Requests for Quotations (RFQs) with built-in "British Auction" dynamics. It allows shippers to create RFQs with specific auction rules and enables suppliers to place bids. The system dynamically evaluates bids in real-time, extending auction deadlines based on configurable triggers to foster competition.

## 2. Architecture
The application follows a standard 3-tier architecture:
- **Presentation Layer (Frontend):** React.js (Vite)
- **Application Layer (Backend):** Node.js with Express.js
- **Data Layer (Database):** MongoDB (Atlas)

### 2.1 Components
*   **React Frontend:** Provides a responsive user interface for shippers to create RFQs and monitor auctions, and for suppliers to submit bids and view leaderboards.
*   **Express REST API:** Handles business logic, validates incoming data, enforces auction rules, calculates time extensions, and serves as the intermediary between the frontend and database.
*   **MongoDB:** A NoSQL document database storing RFQs, Bids, and Activity Logs. Mongoose ODM is used for schema validation and query building.

## 3. Core Business Logic (British Auction Dynamics)

The system implements specific logic upon every bid submission to handle the "British Auction" feature:

1.  **Validation:** Ensure the auction is currently `ACTIVE` and the current time is before the `currentBidCloseDate`.
2.  **Bid Placement:** The new bid is recorded in the database.
3.  **Trigger Window Check:** The system checks if the bid was placed within the predefined `triggerWindowMinutes` before the `currentBidCloseDate`.
4.  **Extension Rule Evaluation:** If within the window, the system evaluates the `extensionTriggerType`:
    *   `ANY_BID`: Any valid bid placed within the window triggers an extension.
    *   `ANY_RANK_CHANGE`: An extension is triggered if the new bid alters the ranking order of the current bidders.
    *   `L1_RANK_CHANGE`: An extension is triggered only if the new bid becomes the lowest overall bid (Rank 1).
5.  **Auction Extension:** If a rule is triggered, the `currentBidCloseDate` is pushed forward by `extensionDurationMinutes`.
6.  **Forced Close Cap:** The `currentBidCloseDate` can never exceed the predefined `forcedBidCloseDate`. If an extension pushes the time past this cap, the close time is clamped to the `forcedBidCloseDate`.
7.  **Audit Logging:** Every bid submission and auction extension is recorded in the `ActivityLog` collection for transparency.

## 4. API Endpoints

*   **`POST /api/rfqs`**: Create a new RFQ.
*   **`GET /api/rfqs`**: Retrieve a list of all RFQs, evaluating and updating the status (`ACTIVE`, `CLOSED`, `FORCE_CLOSED`) based on current time.
*   **`GET /api/rfqs/:id`**: Retrieve full details of a specific RFQ, including all its associated bids and activity logs.
*   **`POST /api/rfqs/:id/bids`**: Submit a new bid for an RFQ. This endpoint contains the core British Auction extension logic.

## 5. Deployment Architecture
*   **Database:** MongoDB Atlas (Cloud Database).
*   **Backend & Frontend:** Node.js backend serves the compiled React frontend static files in production environments.
