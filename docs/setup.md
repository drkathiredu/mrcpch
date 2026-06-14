# Local Development Setup Guide

Follow these steps to run the MRCPCH Study Platform.

## ⚡ Zero Configuration Mode (Default & Simplest)

You do **NOT** need any API keys, secrets, databases, or Cloudflare credentials to run this application! The frontend is equipped with a high-performance, browser-native database engine (using local state and `localStorage`).

1. **Install dependecies**:
   ```bash
   npm install
   ```

2. **Start the Frontend development server**:
   ```bash
   npm run dev
   ```

3. **Enjoy the platform**:
   Open [http://localhost:3000](http://localhost:3000) to view the client-side revision engine. All custom question banks, mock logins, exams, and results work instantly!

---

## ☁️ Optional: Cloudflare Worker Backend Setup (D1 & KV)

If you explicitly want to deploy or run a server-side API with persistent shared state:

1. **Set up local environment**:
   ```bash
   cp .env.example .env
   ```

2. **Database Schema Setup (Cloudflare D1 Local SQLite)**:
   Boot up your wrangler D1 local emulator and migrate the schema definitions:
   ```bash
   npx wrangler d1 migrations apply mrcpch_db --local
   ```

   Seed the local database with initial medical question banks:
   ```bash
   npx wrangler d1 execute mrcpch_db --local --file=./database/seeds/seed.sql
   ```

3. **Start the Emulator Backend**:
   Run the wrangler dev command to boot the local API server proxy:
   ```bash
   cd worker
   npx wrangler dev --port=8787
   ```

