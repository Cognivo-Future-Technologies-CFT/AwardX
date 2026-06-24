# API Route Inventory

Generated from the endpoint efficiency audit. Use this document to decide which routes are safe to remove after confirming production deployment (Express vs Vercel).

## Runtime model

| Runtime | Location | When active |
|---------|----------|-------------|
| Express | `server/src/routes/` | Local dev (Vite proxies `/api` → `:5001`); production when `VITE_BACKEND_URL` points to Express |
| Vercel serverless | `api/_handlers/registry.ts` | Production on Vercel for registered routes only |
| Supabase direct | `services/database.ts`, `services/supabase.ts` | Many reads/writes bypass REST entirely |

**Mixed deployment warning:** Most Express-only routes return 404 on Vercel-only deploy unless `VITE_BACKEND_URL` is set to a running Express host.

---

## Express + Vercel duplicates (same path, two implementations)

| Method | Path | Express | Vercel | Frontend caller |
|--------|------|---------|--------|-----------------|
| GET | `/api/health` | `server/src/index.ts` | `api/_handlers/health.ts` | Ops only |
| POST | `/api/scores/judge-submit` | `server/src/routes/scores.ts` | `api/_handlers/scores/judge-submit.ts` | `services/scoresApi.ts` → JudgeScoringModal |
| POST | `/api/invites/judge` | `server/src/routes/invites.ts` | `api/_handlers/invites/judge.ts` | `services/email.ts` |
| POST | `/api/invites/team` | same | `api/_handlers/invites/team.ts` | `services/email.ts` |
| POST | `/api/invites/resend` | same | `api/_handlers/invites/resend.ts` | `services/email.ts` |
| GET/POST | `/api/invites/verify-judge` | same | `api/_handlers/invites/verify-judge.ts` | `services/invitesApi.ts` → JudgePortalPage |
| GET/POST | `/api/invites/verify-team` | same | `api/_handlers/invites/verify-team.ts` | `services/invitesApi.ts` → TeamInvitePage |

---

## Vercel-only routes

| Method | Path | Caller |
|--------|------|--------|
| GET | `/api/submissions/my` | `services/database.ts` → MySubmissionsPage |
| POST | `/api/submissions/withdraw` | `services/database.ts` → MySubmissionsPage |
| POST | `/api/webhooks/stripe` | External (Stripe) |
| POST | `/api/webhooks/resend` | External (Resend) |
| POST | `/api/payments/create-checkout` | `services/paymentsApi.ts` → FormSubmissionPage |
| POST | `/api/payments/stripe-verify` | `services/paymentsApi.ts` → FormSubmissionPage |
| POST | `/api/payments/razorpay-verify` | `services/paymentsApi.ts` → FormSubmissionPage |
| GET | `/api/payments/stripe-connect-start` | `services/paymentsApi.ts` → SettingsView |
| GET | `/api/payments/stripe-connect-status` | `services/paymentsApi.ts` → SettingsView |
| POST | `/api/notifications/deadline-approaching` | **UNUSED** |
| POST | `/api/notifications/judge-assigned` | **UNUSED** |
| POST | `/api/notifications/new-submission` | **UNUSED** |

---

## Express-only routes (not in Vercel registry)

All routes under: auth, organizations, programs (except categories/submissions via API), overview, schedule-rounds, execution, advancement, judge-assignment, voting, leaderboard, mass-email, integrations, KYC, announcements, program-forms.

Notable Express-only caller:

| Method | Path | Caller |
|--------|------|--------|
| GET | `/api/invites/my-judge-invites` | `services/database.ts` → OrganizationSelectionView |

---

## Used Express routes (frontend callers)

| Method | Path | Service / component |
|--------|------|---------------------|
| POST | `/api/programs` | `services/supabase.ts` |
| GET/POST/DELETE | `/api/programs/:id/categories` | `services/database.ts` |
| GET/POST/PATCH/DELETE | `/api/programs/:id/submissions` | `services/database.ts` |
| GET/POST/PUT/DELETE | `/api/program-forms/*` | `services/database.ts` |
| GET/PUT | `/api/schedule-rounds/:id/active-form` | `services/database.ts` |
| GET/POST/PUT/DELETE | `/api/schedule-rounds/:id/rounds` | `services/scheduleRoundsDb.ts`, `services/massEmailApi.ts` |
| GET/PUT | `/api/schedule-rounds/:id/edges` | `services/scheduleRoundsDb.ts` |
| POST | `/api/execution/rounds/:id/activate` | `services/roundPipelineApi.ts` |
| POST | `/api/execution/rounds/:id/complete` | `services/roundPipelineApi.ts` |
| POST | `/api/execution/rounds/:id/promote` | `services/roundPipelineApi.ts` |
| POST | `/api/execution/programs/:id/reset-pipeline` | `services/roundPipelineApi.ts` |
| POST | `/api/execution/programs/:id/sync-enrollments` | `services/roundPipelineApi.ts` |
| POST | `/api/execution/programs/:id/enroll-submission` | `services/database.ts`, `roundPipelineApi.ts` |
| POST | `/api/advancement/rounds/:id/preview` | `services/roundPipelineApi.ts` |
| POST | `/api/advancement/rounds/:id/execute` | `services/roundPipelineApi.ts` |
| POST | `/api/advancement/rounds/:id/inform` | `services/roundPipelineApi.ts` |
| GET | `/api/voting/s/:slug` | `services/votingApi.ts` → PublicVotingPage |
| GET | `/api/voting/:roundId` | `services/votingApi.ts` → PublicVotingPage |
| GET/PUT | `/api/voting/:roundId/config` | `services/votingApi.ts` |
| GET | `/api/voting/:roundId/my-votes` | `services/votingApi.ts` |
| POST | `/api/voting/:roundId/vote` | `services/votingApi.ts` |
| GET | `/api/voting/:roundId/leaderboard` | `services/votingApi.ts` |
| GET | `/api/leaderboard/:programId` | `LeaderboardView.tsx` |
| GET | `/api/leaderboard/rounds/:roundId` | `LeaderboardView.tsx` |
| GET | `/api/mass-email/:programId/rounds/:roundId/segments` | `services/massEmailApi.ts` |
| POST | `/api/mass-email/:programId/rounds/:roundId/send` | `services/email.ts` |
| GET | `/api/mass-email/:programId/history` | `services/broadcastApi.ts` |
| POST | `/api/mass-email/:programId/send-custom` | `services/broadcastApi.ts` |
| GET/PUT/POST | `/api/integrations/*` | `services/integrations.ts` |
| POST | `/api/kyc/didit/start` | `services/votingApi.ts` |
| GET | `/api/kyc/status/:programId` | `services/votingApi.ts` |
| GET | `/api/overview/public/by-slug/:slug` | `services/overviewApi.ts` |
| GET | `/api/overview/public/:programId` | `services/overviewApi.ts` |
| GET | `/api/overview/:programId/media` | `services/overviewApi.ts` |
| POST | `/api/overview/:programId/invalidate-cache` | `services/overviewApi.ts` |
| GET | `/api/announcements/programs/:programId/public` | `services/announcementsApi.ts` |

---

## Unused REST handlers (no frontend caller)

| Area | Routes | Notes |
|------|--------|-------|
| Auth | `GET /api/auth/user` | Frontend uses Supabase session |
| Organizations | `GET /current/info`, `GET/POST/PUT /:id` | Org selection via Supabase |
| Programs | `GET /`, `GET /:id`, `GET /:id/stats`, `PUT /:id`, `DELETE /:id` | CRUD via Supabase; only `POST /api/programs` used |
| Overview builder | `GET /:programId`, `PUT /config`, section/sponsor/faq/timeline mutations | PageBuilder uses Supabase `programPages` |
| Judge assignment | All `/api/judge-assignment/*` | UI uses Supabase `assignJudges`; auto-strategies unused in UI |
| Round execution | `finalize`, `cancel`, `GET status`, `GET pipeline-status` | Routes exist; UI only uses activate/complete/promote |
| Advancement | `override`, `GET history` | Preview/execute/inform used |
| Voting admin | `GET /results`, `GET /voters` | No component references |
| Schedule rounds | `GET .../submissions`, `GET .../submissions/count` | No frontend usage |
| Notifications | All 3 POST handlers | Zero callers |

---

## Functional duplicates (API vs Supabase)

| Domain | REST routes | What frontend uses |
|--------|-------------|-------------------|
| Programs CRUD | `programs.ts` | Supabase `supabasePrograms.*` |
| Page builder | Overview mutation routes | Supabase `programPages` |
| Judge assignment | `/api/judge-assignment/*` | Supabase `submissions.assignJudges` |

---

## Known gaps and bugs

| Issue | Status |
|-------|--------|
| `GET /api/kyc/didit/callback` referenced in `kyc.ts` but no handler registered | **Broken redirect** — needs handler or URL fix |
| MassEmailView called `/api/schedule-rounds/:id` (missing `/rounds`) | **Fixed** — uses `services/massEmailApi.ts` |
| Express-only routes on Vercel-only deploy | Documented — set `VITE_BACKEND_URL` or port routes |

---

## Client API modules (Phase 1 consolidation)

| Module | Purpose |
|--------|---------|
| `services/backendApi.ts` | Shared `fetchBackendJson`, URL fallback |
| `services/massEmailApi.ts` | Rounds + segments for MassEmailView, BroadcastsView |
| `services/votingApi.ts` | Public voting, config, KYC gate |
| `services/announcementsApi.ts` | Public winners page |
| `services/paymentsApi.ts` | Checkout, verify, Stripe Connect |
| `services/invitesApi.ts` | Team/judge invite verify + accept |
| `services/scoresApi.ts` | Judge portal score submit |
| `services/email.ts` | Invite/mass-email POSTs via `fetchBackendJson` |

---

## Phase 2+ recommendations

1. Confirm production runtime (Express host vs Vercel-only) before deleting duplicate handlers.
2. Remove notification handlers (3 routes, zero callers) in first server cleanup pass.
3. Remove overview mutation routes if PageBuilder stays on Supabase.
4. Unify data path per domain: pick API **or** Supabase, not both.
