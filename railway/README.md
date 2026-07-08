# AwardX Railway Backend

Standalone Express API for deploying AwardX backend on [Railway](https://railway.app), independent of the frontend.

This package includes:

- Express routes (`src/`)
- Shared serverless-style handlers (`api/_handlers/`)
- Shared backend utilities (`lib/`)

## Deploy on Railway

1. Create a new Railway project.
2. Connect this repository.
3. Set **Root Directory** to `railway`.
4. Railway reads `railway.toml` automatically:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Health check:** `GET /api/health`
5. Add environment variables from `.env.example` in the Railway dashboard.
6. Point your frontend at this service:
   - `VITE_BACKEND_URL=https://<your-railway-service>.up.railway.app`

### Required environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access |
| `FRONTEND_URL` | CORS allowlist (comma-separated origins) |
| `SITE_URL` | Emails, OAuth, payment redirect URLs |

Also configure payment/webhook secrets (`STRIPE_*`, `RAZORPAY_*`, `RESEND_*`) as needed.

## Local development

```bash
cd railway
cp .env.example .env
# fill in values
npm install
npm run dev
```

API runs on `http://localhost:5001` by default.

- Health: `GET /api/health`
- All Express routes: `/api/*`

## Sync from monorepo

When `server/`, `api/`, or shared `lib/` files change in the main repo:

```bash
node railway/scripts/sync-from-monorepo.mjs
```

This copies sources and re-applies Railway-specific `src/index.ts` path fixes.

## Architecture

```
railway/
├── src/           # Express app + routes + services (TypeScript, run via tsx)
├── api/           # Payment, webhook, notification handlers (.ts only)
├── lib/           # Shared modules used by api handlers
├── package.json
└── railway.toml   # Railway deploy config
```

Express handles most product APIs. Unmatched `/api/*` paths fall through to `api/_handlers/registry.ts` (payments, webhooks, notifications, etc.). No build step — `tsx` runs TypeScript directly.
