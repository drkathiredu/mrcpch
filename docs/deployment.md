# Production Deployment Guide

Deploying the platform takes advantage of Cloudflare’s global edge network via Pages and Workers.

---

## ⚡ Zero-Configuration Deployment (Default & Recommended)

By default, the platform is structured to build and deploy **instantly** without requiring D1 Cloud Databases, R2 buckets, KV stores, or secret variables! 

The deployed Edge Worker has beautiful **built-in simulated storage adapters** for users, question banks, study guides, and exams. This allows you to deploy and immediately use a fully collaborative edge API without entering a single secret key.

### Step 1: Deploy Cloudflare Pages (Frontend)
1. **Sign in to Cloudflare Dashboard**: Go to **Workers & Pages** -> **Pages** -> **Create a project** -> **Connect to Git**.
2. **Select GitHub Repository**: Connect your GitHub account and select your repository.
3. **Configure Build Settings**:
   - **Framework Preset**: `Vite` (or `None`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
   - **Root Directory**: Leave as `/` (root)
4. **Deploy**: Click **Save and Deploy**. Cloudflare automatically compiles and hosts your SPA. Client-side routes (like `/banks` and `/materials`) will resolve gracefully through index.html fallback rules.

### Step 2: Deploy Cloudflare Worker (Backend)
If you have connected your GitHub to Cloudflare's **Workers Builds**, the Edge Worker is deployed completely automatically on push. 
To deploy it manually from your computer, simply run:
```bash
npx wrangler deploy
```
That's it! Since `wrangler.jsonc` does not require any active database bindings, your Worker edge backend will deploy successfully in **less than 10 seconds** with zero secret keys required.

---

## ☁️ Optional: Transitioning to Real Production D1 & R2 Storage

If you eventually want to persist custom questions created online across multiple devices via a live relational SQL database, you can bind Cloudflare D1 and R2 to your Worker in 3 quick steps:

### 1. Provision D1 & R2 on your Cloudflare Account:
```bash
# Create D1 database
npx wrangler d1 create mrcpch_db

# Create R2 Bucket
npx wrangler r2 bucket create mrcpch-materials-bucket
```

### 2. Update your `wrangler.jsonc` to bind the resources:
Add the following blocks back to your `/wrangler.jsonc` file:
```json
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mrcpch_db",
      "database_id": "YOUR_DATABASE_ID_FROM_TERMINAL"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "mrcpch-materials-bucket"
    }
  ]
```

### 3. Run migrations and deploy:
```bash
# Push schema tables onto production
npx wrangler d1 migrations apply mrcpch_db --remote

# Seed the question banks
npx wrangler d1 execute mrcpch_db --remote --file=./database/seeds/seed.sql

# Deploy the Worker
npx wrangler deploy
```
