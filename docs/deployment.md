# Production Deployment Guide

Deploying the platform takes advantage of Cloudflare’s global edge network via Pages and Workers.

## Cloudflare Pages Setup (Frontend with Direct GitHub Integration)

Cloudflare Pages connects directly to your GitHub repository, building and deploying your frontend automatically on every push.

1. **Sign in to Cloudflare Dashboard**: Go to **Workers & Pages** -> **Pages** -> **Create a project** -> **Connect to Git**.
2. **Select GitHub Repository**: Connect your GitHub account and select your repository.
3. **Configure Build Settings**:
   - **Framework Preset**: `Vite` (or `None`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
   - **Root Directory**: Leave as `/` (root) so the root `vite.config.ts` handles the build, or set to `frontend` if deploying a sub-project scope.
4. **Setup the Edge API Proxy (`_redirects`)**:
   - Open `/frontend/public/_redirects` in your code editor.
   - Replace the default placeholder `https://mrcpch-study-platform.your-subdomain.workers.dev` with your actual deployed Cloudflare Worker API subdomain.
   - Commit and push this change to GitHub. Cloudflare Pages will read the `_redirects` file, redirecting `/api/*` directly to your Worker backend at the edge without any CORS issues or manual DNS rewrites.
5. **Environment Variables (Optional)**: Add any public configuration variables, such as `VITE_TURNSTILE_SITE_KEY` if using Cloudflare Turnstile protection, to the Pages configuration panel.
6. **Deploy**: Click **Save and Deploy**. Cloudflare automatically compiles and hosts your SPA. Client-side routes (like `/banks` and `/materials`) will resolve gracefully through index.html fallback rules.

## Cloudflare D1 Database Deployment

Run this command in terminal to provision your live production database:
```bash
npx wrangler d1 create mrcpch_db
```
*Take note of the database unique ID displayed in terminal and paste it inside `wrangler.jsonc` under `database_id` value.*

Run migrations on production:
```bash
npx wrangler d1 migrations apply mrcpch_db --remote
```

Seed the production database:
```bash
npx wrangler d1 execute mrcpch_db --remote --file=./database/seeds/seed.sql
```

## Cloudflare Workers Deployment (Backend)

Register security secrets in the remote worker using wrangler:
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put JWT_REFRESH_SECRET
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Deploy the API worker:
```bash
npx wrangler deploy
```
The endpoint URL is created automatically and printed to the terminal console (e.g. `https://mrcpch-study-platform.<your-subdomain>.workers.dev`).
This binds Workers KV, D1, and R2 automatically as defined in `wrangler.jsonc`.
