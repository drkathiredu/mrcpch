# MRCPCH Study Platform

A full-featured, high-performance preparation platform for pediatric candidates pursuing the **MRCPCH (Membership of the Royal College of Paediatrics and Child Health)** exams. Engineered to be 100% serverless, edge-caching, and secure using **Cloudflare Pages, Workers, D1, R2, and KV**.

## Tech Stack Overview

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Motion React
- **Backend API**: Cloudflare Workers (ES Modules)
- **Database**: Cloudflare D1 (Serverless SQLite)
- **Storage**: Cloudflare R2
- **Caching**: Cloudflare KV Namespaces
- **Bot Defense**: Cloudflare Turnstile

---

## Directory Architecture

```
/
├── frontend/             # Single Page Application (Vite + React 19)
├── worker/               # Serverless edge API handler (Cloudflare Workers)
├── database/             # D1 Schema configurations, migrations, and seeds
│   ├── migrations/       # D1 database setup files
│   └── seeds/            # Initial high-yield pediatric question data
├── docs/                 # Platform guidelines, setup, and deployment guides
├── .github/              # Automation workflows (Typecheck, build validation)
├── wrangler.jsonc        # Cloudflare monorepo binding configuration
├── package.json          # Root scripts and workspace dependencies
└── README.md             # This description
```

---

## Quick Command Guide

### Local Development Start
Install dependencies in workspaces:
```bash
npm install
```

Boot the frontend client immediately:
```bash
npm run dev
```

### Apply D1 Migrations Locally
```bash
npx wrangler d1 migrations apply mrcpch_db --local
```

### Seed Local Database
```bash
npx wrangler d1 execute mrcpch_db --local --file=./database/seeds/seed.sql
```

## Licensing

Licensed under the Apache-2.0 License.
