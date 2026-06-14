# Local Development Setup Guide

Follow these steps to run the MRCPCH Study Platform locally.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Cloudflare Wrangler CLI**: pre-installed or access via `npx wrangler`

## Installation

1. Clone the repository and navigate to the project root:
   ```bash
   cd mrcpch-study-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your local environment file:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and replace deployment variables with actual values (JWT secrets, site keys, etc.).

## Starting Local Environments

### 1. Database (Cloudflare D1 Local SQLite)
Boot up your wrangler D1 local emulator and migrate the schema definitions:
```bash
npx wrangler d1 migrations apply mrcpch_db --local
```

Seed the local database with initial medical question banks:
```bash
npx wrangler d1 execute mrcpch_db --local --file=./database/seeds/seed.sql
```

### 2. Frontend Development Server
The frontend is built on React 19 and Vite. Start the local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the client dashboard interface.

### 3. Worker (Worker Server API Local emulator)
Run the wrangler dev command to boot the local API server proxy:
```bash
cd worker
npx wrangler dev --port=8787
```
This boots the API server matching wrangler.jsonc bindings.
