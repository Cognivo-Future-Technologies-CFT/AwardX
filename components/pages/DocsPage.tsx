import React, { useEffect, useMemo, useRef, useState } from 'react';
import MiniSearch from 'minisearch';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../Logo';
import {
  Search,
  Book,
  Settings,
  Database,
  Shield,
  Layers,
  Zap,
  Code2,
  GitBranch,
  Users,
  Mail,
  FileJson,
  ChevronRight,
  Hash,
  BookOpen,
  Workflow,
  Vote,
  ClipboardList,
  CreditCard,
  Trophy,
  LifeBuoy,
  Sparkles,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from 'lucide-react';

// ----- Docs content model -----
type DocBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h3'; text: string; id?: string }
  | { kind: 'code'; lang?: string; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'callout'; tone: 'info' | 'warn' | 'success'; title: string; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] };

type DocSection = {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  blocks: DocBlock[];
};

const sections: DocSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    category: 'Getting Started',
    icon: Book,
    description: 'A workspace for running awards, hackathons, grants, and competitions end-to-end — entry, judging, voting, and announcement.',
    blocks: [
      {
        kind: 'p',
        text: 'AwardX is a multi-tenant awards management system (AGPL-3.0). You create an organization, add one or more programs, configure intake and judging, then run the full cycle from public submission to winner announcement in one dashboard.',
      },
      {
        kind: 'p',
        text: 'The data model centers on organizations, programs, categories, submissions, and rounds. Judges, forms, scores, payments, public voting, page sections, and integrations all hang off those core tables.',
      },
      {
        kind: 'h3', text: 'What ships in the repo today' },
      {
        kind: 'list',
        items: [
          'Public program microsites at /program/:slug with a drag-and-drop page builder (program_page_sections)',
          'Form builder with multi-page forms, themes, and field types including file upload and payment',
          'Schedule & Rounds — linear tile view and React Flow graph editor with shared round/edge data',
          'Judge portal at /judge/:token (no account required) plus in-dashboard judging and scoring',
          'Public voting at /vote/:slug with leaderboards and rate limiting',
          'Paid entries via Stripe Checkout and Razorpay orders (api/_handlers/payments/)',
          'Resend email, mass email (Reach), team/judge invites, and email_logs audit trail',
          'Didit KYC for programs that require identity verification',
          'Granular permissions (view_submissions, manage_judging, etc.) on customizable org roles',
          'Universal search (⌘K) across dashboard entities',
        ],
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture overview',
    category: 'Getting Started',
    icon: Layers,
    description: 'How the Vite SPA, Express API, serverless handlers, and Supabase backend fit together.',
    blocks: [
      { kind: 'p', text: 'This is a single TypeScript monorepo. The browser app, the long-running Node API in /server, and Vercel-style serverless handlers in /api all share types and Supabase as the system of record.' },
      { kind: 'h3', text: 'Top-level layout' },
      {
        kind: 'table',
        headers: ['Folder', 'Role', 'Stack'],
        rows: [
          ['components/ + src/ + App.tsx', 'Marketing pages and authenticated dashboard SPA', 'Vite 6, React 19, Tailwind v4, Framer Motion, React Router 6, TanStack Query'],
          ['server/', 'Long-running privileged API', 'Node 20+, Express 4, tsx in dev'],
          ['api/', 'Serverless route handlers (Vercel)', 'TypeScript — payments, webhooks, invites, notifications'],
          ['supabase/migrations/', 'Versioned SQL (001–028+)', 'Plain PostgreSQL with RLS policies'],
          ['services/', 'Frontend data layer', 'Supabase JS client, backendApi.ts, database.ts'],
          ['types/ + lib/ + hooks/', 'Shared types and helpers', 'TypeScript'],
        ],
      },
      { kind: 'h3', text: 'Request lifecycle' },
      {
        kind: 'list',
        items: [
          'The browser loads the Vite build and authenticates via Supabase Auth (email/password, magic link, or OAuth).',
          'Reads often go directly to Supabase through services/database.ts; Postgres RLS enforces row access.',
          'Privileged mutations — schedule rounds, advancement, judge assignment, mass email, integrations, overview page writes — go through the Express server at /api/* (proxied in dev).',
          'Bursty or webhook-facing endpoints — Stripe/Resend webhooks, checkout creation, invite verification — live in api/_handlers and resolve through api/[...path].ts.',
          'On boot, server/src/jobs/roundScheduler.ts polls for round start/end transitions when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.',
          'Optional Redis (REDIS_ENABLED=true) caches hot reads in server/src/cache/redisCache.ts; otherwise the cache layer is in-memory/no-op.',
        ],
      },
      { kind: 'h3', text: 'Public routes (no dashboard login)' },
      {
        kind: 'table',
        headers: ['Route', 'Component', 'Purpose'],
        rows: [
          ['/program/:slug', 'PublicProgramPage', 'Program microsite built from page builder sections'],
          ['/form/:formId', 'FormSubmissionPage', 'Public entry form (supports hackathon/GitHub-auth mode)'],
          ['/judge/:token', 'JudgePortalPage', 'Token-signed judge scoring UI'],
          ['/vote/:slug', 'PublicVotingPage', 'Public voting gallery and ballot'],
          ['/team-invite/:token', 'TeamInvitePage', 'Accept organization team invites'],
          ['/my-submissions', 'MySubmissionsPage', 'Authenticated applicant submission history'],
        ],
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'Run locally',
    category: 'Getting Started',
    icon: Zap,
    description: 'Clone, install, configure Supabase, and start the frontend + API together.',
    blocks: [
      { kind: 'p', text: 'You need Node 20+, npm, and a Supabase project. The browser uses the anon key; the Express server and serverless handlers use the service-role key for privileged writes.' },
      {
        kind: 'code',
        lang: 'bash',
        text: `# 1. Install dependencies (also installs server/ via postinstall)
npm install

# 2. Copy env template at the repo root
cp .env.example .env
# Fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY, and optionally RESEND_* / Razorpay / Redis.

# 3. Apply migrations to your Supabase Postgres
#    Run supabase/migrations/*.sql in numeric order, or:
supabase db push

# 4. Start both dev servers (recommended)
npm run dev:all
# Frontend → http://localhost:3000  (Vite proxies /api → :5001)
# Express API → http://localhost:5001

# Or run separately:
npm run dev:client   # Vite only
npm run dev:server   # Express only`,
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Two processes, one app',
        text: 'npm run dev:all runs Vite and Express concurrently. In local dev, leave VITE_BACKEND_URL empty so the frontend calls /api on the same origin and Vite proxies to VITE_BACKEND_PROXY_TARGET (default http://localhost:5001).',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Marketing-only mode',
        text: 'Set VITE_LANDING_ONLY=true to hide login, signup, dashboard, and demo routes — useful for a static marketing deploy (see App.tsx).',
      },
    ],
  },
  {
    id: 'configuration',
    title: 'Environment variables',
    category: 'Setup',
    icon: Settings,
    description: 'Variables read by Vite, the Express server, and serverless handlers.',
    blocks: [
      { kind: 'p', text: 'Client-exposed variables must be prefixed with VITE_. Server secrets live in the repo-root .env (loaded by both Vite and server/src/index.ts). server/.env.example documents additional Razorpay OAuth and Redis keys used by the Express integrations router.' },
      { kind: 'h3', text: 'Frontend (Vite) — .env.example' },
      {
        kind: 'table',
        headers: ['Variable', 'Required', 'Purpose'],
        rows: [
          ['VITE_SUPABASE_URL', 'Yes', 'Supabase project URL'],
          ['VITE_SUPABASE_ANON_KEY', 'Yes', 'Public anon key for the browser Supabase client'],
          ['VITE_BACKEND_URL', 'Prod only', 'Absolute Express/API base URL. Leave empty in dev to use the /api proxy'],
          ['VITE_BACKEND_PROXY_TARGET', 'Dev', 'Where Vite proxies /api (default http://localhost:5001)'],
          ['VITE_SITE_URL', 'Recommended', 'Canonical site URL for links and OAuth redirects'],
          ['VITE_LANDING_ONLY', 'Optional', 'When true, marketing-only deploy — no auth/dashboard routes'],
          ['VITE_STORAGE_BUCKET_*', 'Optional', 'Supabase storage bucket names (default: media)'],
          ['VITE_SENTRY_DSN', 'Optional', 'Frontend error reporting (services/sentry.ts)'],
          ['VITE_APP_ENV', 'Optional', 'Sentry environment tag'],
          ['VITE_STRIPE_PUBLISHABLE_KEY', 'Optional', 'Stripe publishable key for client-side checkout'],
          ['VITE_RAZORPAY_KEY_ID', 'Optional', 'Razorpay key id returned from create-checkout'],
        ],
      },
      { kind: 'h3', text: 'Server (Express + api handlers)' },
      {
        kind: 'table',
        headers: ['Variable', 'Required', 'Purpose'],
        rows: [
          ['SUPABASE_URL', 'Yes', 'Same project URL as VITE_SUPABASE_URL'],
          ['SUPABASE_SERVICE_ROLE_KEY', 'Yes', 'Bypasses RLS — server only, never expose to browser'],
          ['SUPABASE_ANON_KEY', 'Some routes', 'Used where anon context is needed server-side'],
          ['PORT', 'Optional', 'Express listen port (default 5001; avoids macOS AirPlay on 5000)'],
          ['FRONTEND_URL', 'Optional', 'CORS allowlist (comma-separated origins, default http://localhost:3000)'],
          ['SITE_URL / VITE_SITE_URL', 'Recommended', 'Absolute URLs in emails, OAuth callbacks, payment redirects'],
          ['RESEND_API_KEY', 'Recommended', 'Fallback Resend key; per-org keys also stored in organization_integrations'],
          ['RESEND_FROM', 'Recommended', 'Default From header for transactional email'],
          ['STRIPE_SECRET_KEY', 'Payments', 'Stripe Checkout session creation'],
          ['STRIPE_WEBHOOK_SECRET', 'Payments', 'Verifies api/_handlers/webhooks/stripe.ts'],
          ['RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET', 'Payments', 'Razorpay order creation in create-checkout'],
          ['RAZORPAY_OAUTH_CLIENT_ID / RAZORPAY_OAUTH_CLIENT_SECRET', 'Integrations', 'Razorpay Connect OAuth in server/src/routes/integrations.ts'],
          ['REDIS_ENABLED', 'Optional', 'Set true to enable Redis cache (default false)'],
          ['REDIS_URL / REDIS_TOKEN', 'Optional', 'Redis connection (ioredis in server/src/cache/redisCache.ts)'],
          ['REDIS_NAMESPACE', 'Optional', 'Cache key prefix (default awardx)'],
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Service-role key is server-only',
        text: 'Never expose SUPABASE_SERVICE_ROLE_KEY in the browser or in any VITE_ variable. It bypasses RLS entirely.',
      },
    ],
  },
  {
    id: 'database',
    title: 'Database & migrations',
    category: 'Setup',
    icon: Database,
    description: 'Plain SQL migrations against Supabase Postgres, with RLS as the primary authorization gate.',
    blocks: [
      { kind: 'p', text: 'The platform uses raw SQL migration files committed to supabase/migrations/. There is no ORM — the frontend uses the Supabase JS client and the API server uses @supabase/supabase-js with the service-role key.' },
      { kind: 'h3', text: 'Migration workflow' },
      {
        kind: 'code',
        lang: 'bash',
        text: `# 1. Add a new file with a numeric prefix (current range: 001 → 028)
#    supabase/migrations/029_my_change.sql
# 2. Write the change as plain SQL, including any new RLS policies
# 3. Apply with the Supabase CLI
supabase db push

# Generated TS types live in services/database.types.ts.
# Regenerate after schema changes:
npx supabase gen types typescript --project-id YOUR_PROJECT_ID \\
  > services/database.types.ts`,
      },
      { kind: 'h3', text: 'Core tables' },
      {
        kind: 'list',
        items: [
          'organizations + organization_members — tenant boundary; members link to roles',
          'profiles — user profile row keyed to auth.users',
          'roles + role_permissions + permissions — customizable org roles (TeamsView)',
          'programs — awards cycle; holds slug, active_form_id, integration_sources, kyc_enabled',
          'categories — program categories and subcategories (parent_id for nesting)',
          'program_forms — JSON form schemas; programs.active_form_id points to the live form',
          'program_page_configs + program_page_sections — public microsite builder content',
          'submissions + submission_files — entries, payment_status, judging state',
          'rounds + round_edges + round_submissions — workflow graph and per-round entrant state',
          'judges + judge_groups + judge_category_assignments + judging_panels — panel structure',
          'judging_criteria + scores + judge_comments — per-criterion scoring',
          'voting_configs — public voting slug, limits, and access rules',
          'program_payment_configs — enabled flag, fee_amount, provider (stripe/razorpay/paypal)',
          'organization_integrations — Resend and Didit credentials per org',
          'integration_connect_sessions — OAuth/connect handshakes for Razorpay and Resend',
          'invites + email_logs + invite_request_traces — invite delivery audit trail',
          'advancement_events + advancement_details — transactional round advancement history',
          'audit_logs — append-only sensitive action log',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'RLS is enforced',
        text: 'RLS policies start in 001_rls_policies.sql with hardening in 006, 012, 019, 020, and related migrations. The browser can query Supabase directly for allowed reads; denied rows return permission errors rather than leaking data.',
      },
    ],
  },
  {
    id: 'authentication',
    title: 'Authentication & roles',
    category: 'Setup',
    icon: Shield,
    description: 'Supabase Auth for sign-in; organization roles and permissions for dashboard access.',
    blocks: [
      { kind: 'p', text: 'Sign-in is handled by Supabase Auth (services/supabase.ts). Supported methods: email + password, magic link (signInWithOtp), and OAuth via signInWithProvider (google, github, linkedin). The login/signup UI currently exposes Google OAuth; other providers are available in code once enabled in your Supabase project.' },
      { kind: 'p', text: 'Authenticated requests send the Supabase session JWT as Authorization: Bearer to Express routes (see services/backendApi.ts getAuthToken).' },
      { kind: 'h3', text: 'Permission keys (services/models.ts)' },
      {
        kind: 'table',
        headers: ['Permission key', 'Dashboard areas gated'],
        rows: [
          ['view_overview', 'Dashboard overview stats'],
          ['manage_programs', 'Program setup, schedule, awards, categories, submission process'],
          ['view_submissions', 'Submissions table (read)'],
          ['manage_submissions', 'Accept/reject/delete submissions'],
          ['view_judging', 'Judging views (read)'],
          ['manage_judging', 'Assign judges, configure criteria'],
          ['manage_forms', 'Form builder'],
          ['view_analytics', 'Analytics view'],
          ['manage_teams', 'Teams & role invites'],
          ['view_logs', 'Audit logs'],
          ['manage_settings', 'Organization settings and integrations'],
        ],
      },
      { kind: 'h3', text: 'Organization roles' },
      {
        kind: 'p',
        text: 'Roles are stored in the roles table and assigned through organization_members.role_id. TeamsView lets admins create custom roles and attach permission keys. Express middleware in programManagement.ts treats organization owners, admins, and program managers as able to manage program mutations.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Permission checks happen in two places',
        text: 'The dashboard hides nav items via databaseService.hasPermission(...) and lib/dashboardViews.ts. Express re-checks every privileged route in server/src/middleware (auth.ts, programAccess.ts, programManagement.ts) — never trust the client alone.',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Judges are not dashboard users',
        text: 'Judges typically access /judge/:token without a full account. Team members and program managers authenticate through Supabase and are scoped to their organization.',
      },
    ],
  },
  {
    id: 'programs',
    title: 'Organizations, programs & categories',
    category: 'Core Concepts',
    icon: Trophy,
    description: 'The hierarchy every other feature hangs off.',
    blocks: [
      { kind: 'p', text: 'An organization is the billing and team boundary. A program is a single cycle (e.g. "2026 Design Awards") with its own slug, categories, forms, rounds, and public page. Categories live in the categories table and support nesting via parent_id.' },
      { kind: 'h3', text: 'Lifecycle of a program' },
      {
        kind: 'list',
        items: [
          'Create the program and set title, slug, deadline, branding, and visibility.',
          'Build categories in CategoriesView (flat or nested).',
          'Design the entry form in FormBuilderView; publish and set it as active_form_id.',
          'Compose the public microsite in PageBuilder (program_page_sections) — hero, about, auto rounds, FAQs, CTA, etc.',
          'Configure Schedule & Rounds — linear tiles or React Flow graph (components/dashboard/scheduleRounds/).',
          'Connect integrations (Resend, Didit, Razorpay) in Settings → Integrations or per-program overrides.',
          'Invite judges and assign them to rounds/categories; share /judge/:token links.',
          'Open submissions via /program/:slug and /form/:formId; advance between rounds; announce winners.',
        ],
      },
      { kind: 'h3', text: 'Public microsite' },
      {
        kind: 'p',
        text: 'PublicProgramPage renders sections from components/pages/PublicPageSections.tsx. Section types include hero, about, auto_categories, auto_rounds, auto_key_dates, auto_faqs, auto_sponsors, highlights, process, eligibility, cta, and rich_text. The overview API (server/src/routes/overviewPage.ts) serves both authenticated builder previews and public payloads at /api/overview/public/:programId and /api/overview/public/by-slug/:slug.',
      },
    ],
  },
  {
    id: 'forms',
    title: 'Form builder & submissions',
    category: 'Core Concepts',
    icon: FileJson,
    description: 'Multi-page forms stored in program_forms; rendered on the public submission page.',
    blocks: [
      { kind: 'p', text: 'FormBuilder (components/dashboard/FormBuilder.tsx) produces fields, pages (FormPage[]), and a theme (FormTheme). Forms are persisted via server/src/routes/programForms.ts. A program references its live form through programs.active_form_id.' },
      { kind: 'h3', text: 'Supported field types' },
      {
        kind: 'list',
        items: [
          'text, textarea, email, date — essentials',
          'select, radio, checkbox — choice fields',
          'file — uploads to Supabase storage (bucket from VITE_STORAGE_BUCKET_SUBMISSIONS)',
          'url, number, image — media and links',
          'award_selector — binds to program categories',
          'payment — collects entry fee when program_payment_configs is enabled (Stripe or Razorpay checkout)',
        ],
      },
      { kind: 'h3', text: 'Multi-page forms' },
      {
        kind: 'p',
        text: 'Forms support multiple pages with per-page field assignment. Applicants step through pages on FormSubmissionPage. Undo/redo and drag-and-drop ordering are built into the builder UI.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Hackathon / GitHub-auth mode',
        text: 'Programs with application_mode = hackathon or require_github_auth = true require the submitter to authenticate with GitHub before filing (see FormSubmissionPage.tsx). KYC can additionally be enforced per program via kyc_enabled and Didit.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Submission management',
        text: 'Dashboard operators use SubmissionTable.tsx for filtering, bulk status changes (server/src/routes/programSubmissions.ts PATCH bulk), and exports. Applicants track entries at /my-submissions.',
      },
    ],
  },
  {
    id: 'judging',
    title: 'Judging & scoring',
    category: 'Core Concepts',
    icon: ClipboardList,
    description: 'Judge groups, criteria, blind evaluation, token portal, and score rollup.',
    blocks: [
      { kind: 'p', text: 'Judging happens inside rounds. Judges see assigned submissions, score against judging_criteria, and save progress. Scores aggregate per round using weights configured in the round and criteria rows.' },
      { kind: 'h3', text: 'Concepts' },
      {
        kind: 'list',
        items: [
          'judges + judge_groups — panel membership for a program',
          'judging_panels + judging_panel_members — structured panels (migration 022)',
          'judge_category_assignments — restrict judges to specific categories',
          'submission_judges — per-submission judge assignments',
          'judging_criteria — weighted criteria per round',
          'scores + judge_comments — per-judge, per-submission records',
          'Blind evaluation — round.blindEvaluation hides applicant identity in judge UI',
          'Auto-assign — server/src/routes/judgeAssignment.ts distributes workload',
        ],
      },
      { kind: 'h3', text: 'Where it lives in the code' },
      {
        kind: 'list',
        items: [
          'Dashboard: JudgingView.tsx, JudgeScoringModal.tsx, GroupJudgingPanel.tsx, JudgeScoresOverviewPanel.tsx',
          'Public judge portal: JudgePortalPage.tsx at /judge/:token',
          'Score submit API: server/src/routes/scores.ts and api/_handlers/scores/judge-submit.ts',
          'Invite flow: server/src/routes/invites.ts + api/_handlers/invites/judge.ts',
        ],
      },
    ],
  },
  {
    id: 'schedule-rounds',
    title: 'Schedule & rounds workflow',
    category: 'Core Concepts',
    icon: Workflow,
    description: 'Compose evaluation as a graph of rounds with start/end conditions and advancement.',
    blocks: [
      { kind: 'p', text: 'A program\'s pipeline is stored as rounds (rows) and round_edges (connections). Two editors render the same data: TileView for linear flows and WorkflowView (React Flow) for branching graphs in components/dashboard/scheduleRounds/.' },
      { kind: 'h3', text: 'Round types (server/src/routes/scheduleRounds.ts)' },
      {
        kind: 'list',
        items: [
          'Nomination, Shortlisting, Public Voting, Public Rating, Announce',
          'jury, public, hybrid, compliance, custom',
        ],
      },
      { kind: 'h3', text: 'What a round configures (types/scheduleRounds.ts)' },
      {
        kind: 'list',
        items: [
          'evaluationLogic — scoring, voting, ranking, or none',
          'evaluatorStrategy — all_judges, assigned_judges, random_assignment, category_based, group_based, custom',
          'startCondition — fixed_datetime, after_previous, or manual_trigger',
          'endCondition — fixed_datetime, manual_close, or auto_close (evaluation count)',
          'shortlistConfig — percentage or fixed count with admin/judges/public visibility',
          'advancementCriteria — top_n, top_percent, all_pass, score thresholds (lib/roundScheduleUtils.ts)',
          'Edges — condition: always, if_shortlisted, if_score_gte, manual_approval, custom_logic',
        ],
      },
      { kind: 'h3', text: 'Execution & advancement' },
      {
        kind: 'list',
        items: [
          'Round lifecycle: server/src/routes/roundExecution.ts — activate, complete, finalize, cancel, promote',
          'Advancement preview/execute: server/src/routes/advancement.ts — /api/advancement/rounds/:roundId/preview and /execute',
          'Background scheduler: server/src/jobs/roundScheduler.ts auto-transitions scheduled rounds',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Linear ↔ graph conversion is explicit',
        text: 'Switching between tile (linear) and workflow (graph) views asks for confirmation before destructive overwrites, so a hand-authored branching graph is never silently flattened.',
      },
    ],
  },
  {
    id: 'public-voting',
    title: 'Public voting rounds',
    category: 'Core Concepts',
    icon: Vote,
    description: 'Shareable voting URLs, rate limits, leaderboards, and KYC-gated access.',
    blocks: [
      { kind: 'p', text: 'Public voting rounds expose a slug-based URL at /vote/:slug (also /voting/:roundId for legacy). PublicVotingPage loads config from server/src/routes/publicVoting.ts; voting logic and anti-abuse live in server/src/services/votingEngine.ts.' },
      {
        kind: 'list',
        items: [
          'voting_configs stores public_voting_slug, vote limits, and access rules per round',
          'Cast vote: POST /api/voting/:roundId/vote with rate limiting',
          'Leaderboard: GET /api/voting/:roundId/leaderboard and dashboard LeaderboardView.tsx',
          'Slug lookup: GET /api/voting/s/:slug for public pages',
          'Programs can require Didit KYC before voting when kyc_enabled is set (server/src/routes/kyc.ts)',
          'When a round ends, advancement uses leaderboard cut-off rules via advancementEngine.ts',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Configure in the dashboard',
        text: 'VotingConfigView.tsx and PublicVotingRoundSection.tsx let operators set the public slug, preview the share URL, and manage voting windows alongside round schedule settings.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Paid entries',
    category: 'Core Concepts',
    icon: CreditCard,
    description: 'Stripe Checkout and Razorpay orders for submission fees.',
    blocks: [
      { kind: 'p', text: 'Entry fees are configured per program in program_payment_configs (enabled, fee_amount, currency, provider). Checkout is created through api/_handlers/payments/create-checkout.ts after the submission row exists.' },
      { kind: 'h3', text: 'Implemented providers' },
      {
        kind: 'list',
        items: [
          'stripe — Stripe Checkout sessions; webhook at api/_handlers/webhooks/stripe.ts; verify via payments/stripe-verify',
          'razorpay — Razorpay orders with RAZORPAY_KEY_ID/SECRET; verify via payments/razorpay-verify',
          'Stripe Connect — payments/stripe-connect-start and stripe-connect-status for connected accounts',
          'Razorpay Connect — OAuth flow in server/src/routes/integrations.ts (RAZORPAY_OAUTH_*)',
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'PayPal in UI only',
        text: 'program_payment_configs and the dashboard UI list PayPal as a provider option, but create-checkout.ts currently implements Stripe and Razorpay only. Do not expect PayPal checkout to work until a handler is added.',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Webhook security',
        text: 'Stripe and Resend webhooks verify provider signatures in api/_handlers/webhooks/ before mutating state. Always route payment confirmations through these handlers.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Per-program payment inheritance',
        text: 'programs.integration_sources can inherit payment config from another program in the same org (see lib/programIntegrations.ts and migration 017/018).',
      },
    ],
  },
  {
    id: 'communications',
    title: 'Mass email & invites',
    category: 'Core Concepts',
    icon: Mail,
    description: 'Resend-backed transactional email, Reach campaigns, and invite flows.',
    blocks: [
      { kind: 'p', text: 'Outbound email uses Resend. Credentials are stored per organization in organization_integrations and can be overridden per program via programs.integration_sources (keys: resend, didit, payment).' },
      {
        kind: 'list',
        items: [
          'Team invites — TeamInvitePage at /team-invite/:token; server/src/routes/invites.ts + api/_handlers/invites/team.ts',
          'Judge invites — token links to /judge/:token; api/_handlers/invites/judge.ts',
          'Mass email / Reach — MassEmailView.tsx and ReachView.tsx; send via server/src/routes/massEmail.ts with merge tags like {{submission_title}}',
          'Campaign templates — campaign_templates table; templates surfaced in Reach UI',
          'Transactional notifications — api/_handlers/notifications/ (new-submission, judge-assigned, deadline-approaching)',
          'email_logs — every send attempt recorded with Resend message id for audit and retries',
          'Resend webhook — api/_handlers/webhooks/resend.ts for delivery events',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Connecting Resend',
        text: 'Open Settings → Integrations (IntegrationsPanel.tsx). Org-level Resend uses a guided connect session; programs can inherit or override via integration_sources. Per-org keys are preferred over a global RESEND_API_KEY in production.',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    category: 'Extending',
    icon: Mail,
    description: 'Resend, Didit KYC, Razorpay, Stripe, Redis, and Sentry.',
    blocks: [
      { kind: 'p', text: 'Third-party connections are managed in IntegrationsPanel.tsx and persisted in organization_integrations. Programs can inherit another program\'s integration via programs.integration_sources.' },
      {
        kind: 'table',
        headers: ['Service', 'Purpose', 'Connect path'],
        rows: [
          ['Supabase', 'Postgres, Auth, Storage, Realtime', 'Project credentials in .env'],
          ['Resend', 'Transactional + bulk email', 'Settings → Integrations; organization_integrations provider=resend'],
          ['Didit', 'Identity / KYC for voting and hackathon flows', 'Settings → Integrations; server/src/routes/kyc.ts'],
          ['Razorpay', 'Paid entries + OAuth connect', 'IntegrationsPanel OAuth + program_payment_configs'],
          ['Stripe', 'Checkout + Connect', 'Env keys + api/_handlers/payments/stripe-*'],
          ['Redis', 'Server-side response cache', 'REDIS_ENABLED=true in server env'],
          ['Sentry', 'Frontend error reporting', 'VITE_SENTRY_DSN in .env'],
          ['Vercel Analytics', 'Marketing page views', '@vercel/analytics in client bundle'],
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Integration inheritance',
        text: 'Per program, integration_sources lets you point resend, didit, or payment at another program UUID so a fleet of programs shares one Resend domain or Razorpay account (migration 017/018).',
      },
    ],
  },
  {
    id: 'api',
    title: 'API surface',
    category: 'Extending',
    icon: Code2,
    description: 'Express routers, serverless handlers, and direct Supabase reads.',
    blocks: [
      { kind: 'p', text: 'Pick the surface based on privilege level: RLS-gated reads go through Supabase JS; multi-step business logic goes through Express; webhooks and checkout go through api/_handlers.' },
      { kind: 'h3', text: 'Express routers (server/src/routes/index.ts)' },
      {
        kind: 'table',
        headers: ['Mount path', 'Router file', 'Responsibility'],
        rows: [
          ['/api/auth', 'auth.ts', 'Auth helpers'],
          ['/api/organizations', 'organizations.ts', 'Org CRUD'],
          ['/api/programs', 'programs.ts, programCategories.ts, programSubmissions.ts', 'Programs, categories, submissions'],
          ['/api/program-forms', 'programForms.ts', 'Form schema CRUD'],
          ['/api/schedule-rounds', 'scheduleRounds.ts', 'Rounds and edges'],
          ['/api/execution', 'roundExecution.ts', 'Activate/complete/finalize rounds'],
          ['/api/advancement', 'advancement.ts', 'Preview and execute advancement'],
          ['/api/judge-assignment', 'judgeAssignment.ts', 'Assign judges to rounds'],
          ['/api/voting', 'publicVoting.ts', 'Public vote cast + leaderboard'],
          ['/api/leaderboard', 'leaderboard.ts', 'Program/round leaderboards'],
          ['/api/mass-email', 'massEmail.ts', 'Bulk email to segments'],
          ['/api/invites', 'invites.ts', 'Team and judge invite verification'],
          ['/api/integrations', 'integrations.ts', 'Resend, Razorpay OAuth, status'],
          ['/api/kyc', 'kyc.ts', 'Didit session start and webhooks'],
          ['/api/scores', 'scores.ts', 'Judge score submission'],
          ['/api/overview', 'overviewPage.ts', 'Page builder + public overview payloads'],
        ],
      },
      { kind: 'h3', text: 'Serverless handlers (api/_handlers/registry.ts)' },
      {
        kind: 'list',
        items: [
          'payments/create-checkout, stripe-verify, razorpay-verify, stripe-connect-*',
          'webhooks/stripe, webhooks/resend',
          'invites/judge, invites/team, invites/verify-*, invites/resend',
          'scores/judge-submit',
          'submissions/my, submissions/withdraw',
          'notifications/new-submission, judge-assigned, deadline-approaching',
        ],
      },
      { kind: 'h3', text: 'Example: advance a round' },
      {
        kind: 'code',
        lang: 'bash',
        text: `# Preview who would advance (requires manage_programs auth)
curl -X POST "$API_BASE/api/advancement/rounds/ROUND_ID/preview" \\
  -H "Authorization: Bearer $USER_JWT" \\
  -H "Content-Type: application/json"

# Execute advancement
curl -X POST "$API_BASE/api/advancement/rounds/ROUND_ID/execute" \\
  -H "Authorization: Bearer $USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"criteriaOverride": null}'`,
      },
    ],
  },
  {
    id: 'deployment',
    title: 'Deploying',
    category: 'Deployment',
    icon: Settings,
    description: 'Static frontend, serverless handlers, long-running Express, and Supabase.',
    blocks: [
      { kind: 'p', text: 'Production typically splits into four pieces: Vite static assets, Vercel serverless functions from api/, a hosted Express process from server/, and a Supabase cloud project with migrations applied.' },
      { kind: 'h3', text: 'What to deploy where' },
      {
        kind: 'list',
        items: [
          'Frontend — npm run build outputs dist/; host on Vercel, Netlify, or Cloudflare Pages. vercel.json rewrites non-/api traffic to index.html.',
          'Serverless handlers — api/ is deployed as Vercel functions via api/[...path].ts (maxDuration 30s in vercel.json).',
          'Express server — npm --prefix server run build && node dist/index.js on Fly.io, Render, Railway, or a VPS. Listens on PORT (default 5001).',
          'Database — Supabase hosted Postgres; apply supabase/migrations/*.sql in order on a fresh project.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Production checklist',
        text: 'Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_BACKEND_URL to your public API origin. Put SUPABASE_SERVICE_ROLE_KEY, Stripe/Razorpay secrets, and RESEND keys only on the server. Set FRONTEND_URL to your deployed SPA origin for CORS. Enable REDIS_ENABLED if you run multiple Express instances.',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Landing-only deploys',
        text: 'For marketing sites without auth, set VITE_LANDING_ONLY=true at build time. App.tsx will redirect /login, /signup, /dashboard, and /demo to /.',
      },
    ],
  },
  {
    id: 'testing',
    title: 'Testing',
    category: 'Community',
    icon: GitBranch,
    description: 'Vitest for unit/integration tests, Playwright for end-to-end smoke tests.',
    blocks: [
      {
        kind: 'code',
        lang: 'bash',
        text: `# Unit + integration (single run with coverage)
npm test

# Watch mode
npm run test:watch

# Targeted suites
npx vitest run tests/unit/scheduleRounds
npx vitest run tests/integration/scheduleRounds
npx vitest run tests/integration/submissions
npx vitest run tests/unit/stripeConnect.test.ts

# End-to-end (requires dev servers or deployed URL)
npm run test:e2e`,
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Where the tests live',
        text: 'tests/unit and tests/integration mirror production modules. Schedule & rounds, advancement, judge assignment, program categories/submissions, and overview page have integration coverage. tests/e2e/smoke.spec.ts checks the marketing home, demo flow, and landing-only redirects.',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'E2E prerequisites',
        text: 'Playwright smoke tests expect the app running locally. Demo tests are skipped when VITE_LANDING_ONLY=true (see tests/e2e/smoke.spec.ts).',
      },
    ],
  },
  {
    id: 'support',
    title: 'Getting help',
    category: 'Community',
    icon: LifeBuoy,
    description: 'Where to look when something is wrong.',
    blocks: [
      {
        kind: 'list',
        items: [
          'Frontend errors — check browser console and Sentry if VITE_SENTRY_DSN is set (services/sentry.ts).',
          'API failures — tail Express logs; authorization denials include user and program context in server middleware.',
          'RLS denials — inspect Supabase logs for permission denied on specific tables; compare against 001_rls_policies.sql and later hardening migrations.',
          'Email issues — query email_logs for Resend message ids and failure reasons; verify organization_integrations Resend row.',
          'Payments — confirm webhook endpoints reach api/_handlers/webhooks/stripe.ts and that STRIPE_WEBHOOK_SECRET matches the dashboard.',
          'Voting abuse — review rate limit output from api/_utils/rateLimit.ts and votingEngine.ts logs.',
          'Cache oddities — server boot logs [cache] enabled/configured/available when NODE_ENV !== production.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Health check',
        text: 'Express exposes GET /api/health → { ok: true }. Serverless exposes the same via api/_handlers/health.ts.',
      },
    ],
  },
];

// ----- Page -----

type IndexedDoc = {
  id: string;
  title: string;
  category: string;
  description: string;
  body: string;
};

const buildIndex = (): { mini: MiniSearch<IndexedDoc>; map: Map<string, DocSection> } => {
  const mini = new MiniSearch<IndexedDoc>({
    fields: ['title', 'category', 'description', 'body'],
    storeFields: ['title', 'category', 'description'],
    searchOptions: { boost: { title: 3, category: 2 }, fuzzy: 0.2, prefix: true },
  });
  const map = new Map<string, DocSection>();
  const docs: IndexedDoc[] = sections.map((s) => {
    map.set(s.id, s);
    const body = s.blocks
      .map((b) => {
        if (b.kind === 'p' || b.kind === 'h3') return b.text;
        if (b.kind === 'code') return b.text;
        if (b.kind === 'list') return b.items.join(' ');
        if (b.kind === 'callout') return `${b.title} ${b.text}`;
        if (b.kind === 'table') return [...b.headers, ...b.rows.flat()].join(' ');
        return '';
      })
      .join(' ');
    return { id: s.id, title: s.title, category: s.category, description: s.description, body };
  });
  mini.addAll(docs);
  return { mini, map };
};

const categories = Array.from(new Set(sections.map((s) => s.category)));

const Block: React.FC<{ block: DocBlock }> = ({ block }) => {
  switch (block.kind) {
    case 'p':
      return <p className="text-slate-600 leading-relaxed mb-4">{block.text}</p>;
    case 'h3':
      return (
        <h3 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-display flex items-center gap-2 group">
          <Hash className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          {block.text}
        </h3>
      );
    case 'code':
      return (
        <pre className="bg-slate-950 text-slate-100 rounded-xl p-5 overflow-x-auto text-sm font-mono mb-6 border border-slate-800 shadow-lg">
          <code>{block.text}</code>
        </pre>
      );
    case 'list':
      return (
        <ul className="space-y-2 mb-6">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-slate-600 leading-relaxed">
              <ChevronRight className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'callout': {
      const tones = {
        info: 'bg-indigo-50 border-indigo-200 text-indigo-900',
        warn: 'bg-amber-50 border-amber-200 text-amber-900',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      } as const;
      return (
        <div className={`border rounded-xl p-5 mb-6 ${tones[block.tone]}`}>
          <div className="font-bold text-sm mb-1">{block.title}</div>
          <div className="text-sm leading-relaxed opacity-90">{block.text}</div>
        </div>
      );
    }
    case 'table':
      return (
        <div className="overflow-x-auto mb-6 rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-bold text-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-slate-100">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-slate-600 align-top">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
};

export const DocsPage: React.FC = () => {
  const { mini, map } = useMemo(buildIndex, []);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string>(sections[0].id);
  const [showSearch, setShowSearch] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return mini.search(query, { fuzzy: 0.2, prefix: true }).slice(0, 8);
  }, [query, mini]);

  // Items the keyboard cursor moves through: search results when querying,
  // popular pages when empty. Mirrors UniversalSearchPalette's flat list.
  const flatItems = useMemo(() => {
    if (hasQuery) return results.map((r) => map.get(r.id as string)!).filter(Boolean);
    return ['introduction', 'getting-started', 'configuration', 'schedule-rounds', 'api']
      .map((id) => map.get(id))
      .filter((s): s is DocSection => Boolean(s));
  }, [hasQuery, results, map]);

  // Reset cursor whenever the visible set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, showSearch]);

  // Keep the highlighted row in view as the user arrows through.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Cmd/Ctrl + K to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 30);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Scroll-spy: highlight sidebar entry of the section currently in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          setActiveId(top.target.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px' }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jumpTo = (id: string) => {
    setShowSearch(false);
    setQuery('');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 pb-24">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center gap-3 text-xs font-bold tracking-widest uppercase text-indigo-600 mb-4">
          <BookOpen className="w-4 h-4" /> <Logo size="xs" /> Docs
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 font-display tracking-tight mb-4">
          Documentation
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          How AwardX is structured, how to run it locally, and how to extend it.
          Every section is verified against the current codebase — not legacy READMEs.
        </p>

        {/* Search trigger — matches the dashboard search bar */}
        <div className="mt-8 max-w-xl">
          <button
            type="button"
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchInputRef.current?.focus(), 30);
            }}
            aria-label="Search documentation"
            className="relative w-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
            <div className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-400 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
              <span>Search docs &mdash; try &ldquo;integrations&rdquo; or &ldquo;advancement&rdquo;</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-500">&#8984;K</kbd>
            </div>
          </button>
        </div>
      </div>

      {/* Search palette — mirrors UniversalSearchPalette in the dashboard */}
      <AnimatePresence>
        {showSearch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9998] bg-slate-950/40 backdrop-blur-[8px]"
              onClick={() => setShowSearch(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed inset-x-0 top-[12vh] z-[9999] mx-auto w-full max-w-2xl px-4"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const target = flatItems[activeIndex];
                  if (target) jumpTo(target.id);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowSearch(false);
                }
              }}
            >
              {/* Detached search input pill */}
              <div className="flex items-center gap-4 rounded-full border border-white/40 bg-white/75 backdrop-blur-xl px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-white/10 transition-all duration-300 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/30">
                <Search className="h-5 w-5 shrink-0 text-indigo-500" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the docs..."
                  className="flex-1 bg-transparent border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none text-[17px] text-slate-900 placeholder:text-slate-400 font-medium"
                  style={{ border: 'none', background: 'transparent', boxShadow: 'none', outline: 'none' }}
                />
                <kbd className="hidden sm:inline-flex h-6 items-center rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-[9px] font-extrabold text-slate-400 tracking-widest">
                  ESC
                </kbd>
              </div>

              {/* Detached results panel */}
              <div className="mt-4 overflow-hidden rounded-[28px] border border-white/30 bg-white/75 backdrop-blur-xl shadow-[0_32px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
                <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain py-3 px-3 space-y-1">
                  {!hasQuery && (
                    <div className="px-5 py-10 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/60 shadow-inner">
                        <Sparkles className="h-6 w-6 text-indigo-500" />
                      </div>
                      <p className="text-base font-bold text-slate-800">Search the documentation</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Jump to any section — environment, integrations, advancement, public routes, deployment.
                      </p>
                      <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100/50 pt-5 max-w-sm mx-auto">
                        <span className="flex items-center gap-1.5"><ArrowUp className="h-3.5 w-3.5" /><ArrowDown className="h-3.5 w-3.5" /> Navigate</span>
                        <span className="flex items-center gap-1.5"><CornerDownLeft className="h-3.5 w-3.5" /> Select</span>
                        <span className="flex items-center gap-1.5">ESC Close</span>
                      </div>
                    </div>
                  )}

                  {hasQuery && results.length === 0 && (
                    <div className="px-5 py-12 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50/40">
                        <Search className="h-7 w-7 text-slate-300" />
                      </div>
                      <p className="text-base font-bold text-slate-800">No results found</p>
                      <p className="mt-1 text-sm text-slate-500">We couldn&rsquo;t find anything matching &ldquo;{query}&rdquo;.</p>
                    </div>
                  )}

                  {flatItems.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-4 py-2 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          {hasQuery ? 'Results' : 'Popular pages'}
                        </span>
                      </div>
                      {flatItems.map((section, idx) => {
                        const Icon = section.icon;
                        const isActive = activeIndex === idx;
                        return (
                          <button
                            key={section.id}
                            data-index={idx}
                            type="button"
                            onClick={() => jumpTo(section.id)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`group flex w-full items-center gap-4 px-4 py-3 text-left rounded-2xl transition-all duration-200 ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]'
                                : 'text-slate-700 hover:bg-slate-50/50 hover:scale-[1.005]'
                            }`}
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-50/50 text-indigo-500 group-hover:bg-indigo-100/50'
                              } [&>svg]:h-5 [&>svg]:w-5`}
                            >
                              <Icon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`truncate text-[15px] font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                {section.title}
                              </div>
                              <div className={`mt-0.5 truncate text-[13px] ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                                {section.description}
                              </div>
                            </div>
                            {isActive && (
                              <CornerDownLeft className="h-4 w-4 shrink-0 text-white opacity-90" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {hasQuery && results.length > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-200/30 bg-slate-50/30 px-5 py-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {results.length} result{results.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><ArrowUp className="h-3.5 w-3.5" /><ArrowDown className="h-3.5 w-3.5" /> Navigate</span>
                      <span className="flex items-center gap-1.5"><CornerDownLeft className="h-3.5 w-3.5" /> Open</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Body grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-12">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-28 lg:self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <nav className="space-y-6">
            {categories.map((cat) => (
              <div key={cat}>
                <div className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3 px-2">{cat}</div>
                <div className="space-y-0.5">
                  {sections.filter((s) => s.category === cat).map((s) => {
                    const Icon = s.icon;
                    const active = activeId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => jumpTo(s.id)}
                        className={`w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-2 border-indigo-500 -ml-0.5 pl-3'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-indigo-500' : 'text-slate-400'}`} />
                        {s.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          </nav>
        </aside>

        {/* Content */}
        <article className="max-w-3xl">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <section key={s.id} id={s.id} className="scroll-mt-28 mb-20">
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">
                  <Icon className="w-4 h-4" /> {s.category}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 font-display tracking-tight">{s.title}</h2>
                <p className="text-lg text-slate-500 mb-8 leading-relaxed">{s.description}</p>
                <div className="prose-awardx">
                  {s.blocks.map((b, bi) => (
                    <Block key={bi} block={b} />
                  ))}
                </div>
                {i < sections.length - 1 && (
                  <div className="mt-16 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                )}
              </section>
            );
          })}

          <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden mt-12">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/30 blur-[100px] rounded-full" />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-3 font-display">Still stuck?</h3>
              <p className="text-slate-300 mb-6">
                Most issues map to a concrete file in the repo. Check Sentry, Express logs, Supabase RLS denials, and email_logs — the Getting help section walks through each.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => jumpTo('support')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-colors"
                >
                  <LifeBuoy className="w-4 h-4" /> Read troubleshooting
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
