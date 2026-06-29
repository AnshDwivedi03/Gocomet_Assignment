# BidForge — Smart Auction Platform

A full-stack RFQ (Request for Quotation) platform with **British Auction dynamics**. Suppliers compete by placing progressively lower offers, and the system automatically extends the auction deadline when activity is detected near closing — ensuring transparent competition and preventing last-second sniping.

> **Live Backend API:** [https://gocomet-backend-k6v7.onrender.com](https://gocomet-backend-k6v7.onrender.com)
> **Live Frontend (Vercel):** *(Pending Vercel deployment)*
---

## Table of Contents

- [Tech Stack](#tech-stack)
- [High-Level Design (HLD)](#high-level-design-hld)
  - [Architecture Diagram](#architecture-diagram)
  - [British Auction Flow](#british-auction-flow)
- [Schema Design](#schema-design)
  - [RFQ Collection](#1-rfqs-collection)
  - [Bids Collection](#2-bids-collection)
  - [Activity Logs Collection](#3-activity_logs-collection)
  - [Entity Relationship Diagram](#entity-relationship-diagram)
- [Core Features](#core-features)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
- [Deployment](#deployment)

---

## Tech Stack

| Layer        | Technology                          |
| :----------- | :---------------------------------- |
| **Frontend** | React 19 + Vite 8, React Router v7 |
| **Backend**  | Node.js + Express 5                |
| **Database** | MongoDB Atlas (Mongoose ODM)        |
| **Styling**  | Vanilla CSS (Custom Design System)  |
| **Icons**    | Lucide React                        |
| **Dates**    | date-fns                            |

---

## High-Level Design (HLD)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Auction     │  │  Launch       │  │    Auction Details     │  │
│  │  Dashboard   │  │  Auction      │  │  • Supplier Rankings   │  │
│  │             │  │              │  │  • Offer Submission     │  │
│  │  GET /rfqs  │  │ POST /rfqs   │  │  • Countdown Timer     │  │
│  │             │  │              │  │  • Activity Feed        │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │ REST API (JSON)                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      API Routes                            │  │
│  │                                                            │  │
│  │  POST /api/rfqs          → Create new RFQ                 │  │
│  │  GET  /api/rfqs          → List all RFQs + lowest bids    │  │
│  │  GET  /api/rfqs/:id      → RFQ details + bids + logs      │  │
│  │  POST /api/rfqs/:id/bids → Submit bid + auction logic     │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │               British Auction Engine                       │  │
│  │                                                            │  │
│  │  1. Check if bid is within Trigger Window (last X min)     │  │
│  │  2. Evaluate Extension Trigger Type:                       │  │
│  │     • ANY_BID → extend on any bid                         │  │
│  │     • ANY_RANK_CHANGE → extend on ranking shift           │  │
│  │     • L1_RANK_CHANGE → extend only if lowest bidder       │  │
│  │                          changes                           │  │
│  │  3. Extend close time by Y minutes (cap at Forced Close)  │  │
│  │  4. Log the extension event with reason                    │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │              Mongoose ODM (Data Layer)                      │  │
│  │         Models: Rfq, Bid, ActivityLog                      │  │
│  └───────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (Cloud DB)                       │
│                                                                  │
│    ┌──────────┐     ┌──────────┐     ┌─────────────────┐        │
│    │   rfqs   │◄────│   bids   │     │  activity_logs  │        │
│    │          │     │          │     │                 │        │
│    └──────────┘     └──────────┘     └─────────────────┘        │
│         ▲                                     │                  │
│         └─────────────────────────────────────┘                  │
│                   (Referenced by rfqId)                           │
└──────────────────────────────────────────────────────────────────┘
```

### British Auction Flow

```
  Supplier places an offer
          │
          ▼
  ┌───────────────────┐
  │  Is auction ACTIVE │──── No ───► Return "Auction Closed"
  │  and not expired?  │
  └────────┬──────────┘
           │ Yes
           ▼
  ┌───────────────────┐
  │   Save bid to DB   │
  │   Log activity      │
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────────────┐
  │ Is bid within last X min  │──── No ───► Return success
  │ of current close time?    │            (no extension)
  └────────┬──────────────────┘
           │ Yes
           ▼
  ┌───────────────────────────┐
  │ Check Extension Trigger   │
  │ Type configured on RFQ:   │
  │                           │
  │ • ANY_BID → always extend │
  │ • ANY_RANK_CHANGE →       │
  │   extend if ranks shifted │
  │ • L1_RANK_CHANGE →        │
  │   extend if new L1 bidder │
  └────────┬──────────────────┘
           │ Trigger fired
           ▼
  ┌───────────────────────────┐
  │ New Close = Current Close │
  │            + Y minutes    │
  │                           │
  │ Cap at Forced Close Date  │
  │ (never exceed it)         │
  └────────┬──────────────────┘
           │
           ▼
  ┌───────────────────────────┐
  │ Update currentBidCloseDate│
  │ Log extension + reason    │
  └───────────────────────────┘
```

---

## Schema Design

### 1. `rfqs` Collection

Stores each RFQ (auction) and its British Auction configuration.

| Field                      | Type     | Required | Description                                       |
| :------------------------- | :------- | :------- | :------------------------------------------------ |
| `_id`                      | ObjectId | Auto     | Unique identifier                                  |
| `name`                     | String   | Yes      | RFQ name / reference ID                            |
| `bidStartDate`             | Date     | Yes      | When bidding opens                                 |
| `bidCloseDate`             | Date     | Yes      | Original bid close time                            |
| `forcedBidCloseDate`       | Date     | Yes      | Hard deadline (auction can never extend past this) |
| `pickupDate`               | Date     | No       | Pickup / service date                              |
| `status`                   | String   | Yes      | `ACTIVE` / `CLOSED` / `FORCE_CLOSED`              |
| `triggerWindowMinutes`     | Number   | Yes      | X — minutes before close to monitor activity       |
| `extensionDurationMinutes` | Number   | Yes      | Y — minutes to extend when triggered               |
| `extensionTriggerType`     | String   | Yes      | `ANY_BID` / `ANY_RANK_CHANGE` / `L1_RANK_CHANGE`  |
| `currentBidCloseDate`      | Date     | Yes      | Live close time (updates on each extension)        |
| `createdAt`                | Date     | Auto     | Mongoose timestamp                                 |
| `updatedAt`                | Date     | Auto     | Mongoose timestamp                                 |

### 2. `bids` Collection

Stores every bid submitted by suppliers.

| Field                | Type     | Required | Description                          |
| :------------------- | :------- | :------- | :----------------------------------- |
| `_id`                | ObjectId | Auto     | Unique identifier                     |
| `rfqId`              | ObjectId | Yes      | Reference to parent RFQ (Foreign Key) |
| `supplierId`         | String   | Yes      | Supplier identifier                   |
| `carrierName`        | String   | Yes      | Carrier / logistics partner name      |
| `freightCharges`     | Number   | Yes      | Freight charges (₹)                  |
| `originCharges`      | Number   | Yes      | Origin charges (₹)                   |
| `destinationCharges` | Number   | Yes      | Destination charges (₹)              |
| `totalAmount`        | Number   | Yes      | Computed: freight + origin + dest     |
| `transitTime`        | Number   | No       | Transit time in days                  |
| `quoteValidity`      | String   | No       | How long the quote is valid           |
| `createdAt`          | Date     | Auto     | Mongoose timestamp                    |
| `updatedAt`          | Date     | Auto     | Mongoose timestamp                    |

### 3. `activity_logs` Collection

Tracks all auction events (bid submissions & time extensions).

| Field         | Type     | Required | Description                                     |
| :------------ | :------- | :------- | :---------------------------------------------- |
| `_id`         | ObjectId | Auto     | Unique identifier                                |
| `rfqId`       | ObjectId | Yes      | Reference to parent RFQ (Foreign Key)            |
| `type`        | String   | Yes      | `BID_SUBMITTED` / `AUCTION_EXTENDED`             |
| `description` | String   | Yes      | Human-readable description with extension reason |
| `createdAt`   | Date     | Auto     | Mongoose timestamp                               |
| `updatedAt`   | Date     | Auto     | Mongoose timestamp                               |

### Entity Relationship Diagram

```
┌─────────────────────┐
│        RFQ          │
│─────────────────────│
│ _id (PK)            │
│ name                │
│ bidStartDate        │
│ bidCloseDate        │
│ forcedBidCloseDate  │
│ pickupDate          │
│ status              │
│ triggerWindowMinutes│
│ extensionDuration   │
│   Minutes           │
│ extensionTriggerType│
│ currentBidCloseDate │
└────────┬────────────┘
         │
         │ 1 : N
         │
    ┌────┴─────────────────┐
    │                      │
    ▼                      ▼
┌──────────────┐   ┌──────────────────┐
│     BID      │   │  ACTIVITY_LOG    │
│──────────────│   │──────────────────│
│ _id (PK)     │   │ _id (PK)         │
│ rfqId (FK)   │   │ rfqId (FK)       │
│ supplierId   │   │ type             │
│ carrierName  │   │ description      │
│ freightChg   │   │ createdAt        │
│ originChg    │   │                  │
│ destChg      │   └──────────────────┘
│ totalAmount  │
│ transitTime  │
│ quoteValidity│
│ createdAt    │
└──────────────┘
```

---

## Core Features

### For Buyers (Auction Creators)
- **Launch Auctions** with fully configurable British Auction rules
- **Live leaderboard** displaying supplier rankings (L1, L2, L3…)
- **Real-time countdown** tracking the auction close
- **Activity feed** capturing every offer and extension event with reasons
- **Automatic status management** (Active → Closed → Force Closed)

### British Auction Engine
- **3 Extension Trigger Types**: Any Bid, Any Rank Change, L1 Change
- **Configurable trigger window** (X minutes before close)
- **Configurable extension duration** (Y minutes added)
- **Hard cap at Forced Close Time** — auction never exceeds this
- **Extension logging** with clear reasons for transparency

### For Suppliers (Bidders)
- **Submit competitive offers** with detailed charge breakdowns
- **See real-time rankings** to decide whether to bid lower
- **Transparent auction** — all offers are visible

---

## API Endpoints

| Method | Endpoint              | Description                          |
| :----- | :-------------------- | :----------------------------------- |
| POST   | `/api/rfqs`           | Create a new RFQ                     |
| GET    | `/api/rfqs`           | List all RFQs with lowest bid        |
| GET    | `/api/rfqs/:id`       | Get RFQ details + bids + activity    |
| POST   | `/api/rfqs/:id/bids`  | Submit a bid (triggers auction logic) |

---

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account ([Free Tier](https://cloud.mongodb.com))

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/bidforge-auction.git
cd bidforge-auction
```

### 2. Install Dependencies
```bash
# Install all dependencies (backend + frontend)
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment
```bash
# Create .env file in /backend
cp backend/.env.example backend/.env
```
Edit `backend/.env` and add your MongoDB Atlas connection string:
```
MONGO_URI=mongodb+srv://youruser:yourpassword@yourcluster.mongodb.net/bidforge_db?retryWrites=true&w=majority
```

### 4. Run Locally
```bash
# Terminal 1 — Start Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Start Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deployment

### Free Hosting Stack

| Service       | Provider      | Cost |
| :------------ | :------------ | :--- |
| Frontend      | Vercel        | Free |
| Backend       | Render        | Free |
| Database      | MongoDB Atlas | Free |

### Deploy Backend (Render)
1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Root Directory**: `backend`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. Add environment variable: `MONGO_URI` = your Atlas connection string

### Deploy Frontend (Vercel)
1. Create a new project on [vercel.com](https://vercel.com)
2. Set **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Add environment variable: `VITE_API_URL` = `https://your-backend.onrender.com/api`

---

## Project Structure

```
bidforge-auction/
├── backend/
│   ├── models/
│   │   ├── Rfq.js                # RFQ Mongoose Schema
│   │   ├── Bid.js                # Bid Mongoose Schema
│   │   └── ActivityLog.js        # Activity Log Mongoose Schema
│   ├── db.js                     # MongoDB connection (Mongoose)
│   ├── index.js                  # Express server + API routes + Auction logic
│   ├── package.json
│   ├── .env                      # MongoDB URI (not committed)
│   └── .env.example              # Template for .env
├── frontend/
│   ├── public/
│   │   └── favicon.svg           # App favicon
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RfqListPage.jsx   # Auction dashboard
│   │   │   ├── CreateRfqPage.jsx # Auction launch form
│   │   │   └── RfqDetailsPage.jsx# Leaderboard + activity feed
│   │   ├── api.js                # REST API client
│   │   ├── App.jsx               # Router & layout
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Complete design system
│   ├── index.html                # HTML shell with meta tags
│   ├── vite.config.js            # Vite config + dev proxy
│   ├── eslint.config.js          # ESLint rules
│   └── package.json
├── package.json                  # Root-level scripts
├── .gitignore
└── README.md                     # HLD + Schema Design + Docs
```
