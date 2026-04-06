schedule.md
schedule.md i need you to meet these requirements
Read schedule.md
Read MEMORY.md
Let me explore the codebase to understand the current architecture and what's already built.

Agent:Explore DB models and services
IN
Explore this competition management platform codebase thoroughly. I need to understand:

1. The database schema/models — read services/models.ts and services/database.ts and services/supabase.ts fully
2. Any existing schedule/rounds implementation — check server/src/routes/scheduleRounds.ts and any related files
3. The existing API routes — read server/src/routes/index.ts to see all endpoints

Report back: all table names, all model types/interfaces, all existing API endpoints, and what functionality is already implemented vs what's missing.
Agent:Explore frontend components
IN
Explore the frontend of this competition management platform. I need to understand:

1. All dashboard components — read components/dashboard/Dashboard.tsx, DashboardLayout.tsx, TeamsView.tsx, JudgeScoringModal.tsx
2. The judge portal — read components/pages/JudgePortalPage.tsx
3. Any existing schedule/round UI components
4. The overall app structure — check for pages, routing, layout patterns

Report back: what UI exists, what pages/views are built, how routing works, what state management is used (React Query?), and what UI is missing relative to a full competition management system with forms, schedule/rounds, judge assignment, and public voting.
Bash
IN
find /Users/nitish/awardco -type f -name "*.ts" -o -name "*.tsx" | head -30

OUT
/Users/nitish/awardco/index.tsx
/Users/nitish/awardco/App.tsx
/Users/nitish/awardco/types/scheduleRounds.ts
/Users/nitish/awardco/types/roundExtensions.ts
/Users/nitish/awardco/types/overviewPage.ts
/Users/nitish/awardco/contexts/AuthContext.tsx
/Users/nitish/awardco/contexts/ProgramContext.tsx
/Users/nitish/awardco/node_modules/@alloc/quick-lru/index.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-time.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-interpolate.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-scale.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-shape.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-timer.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-array.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-ease.d.ts
/Users/nitish/awardco/node_modules/tapable/tapable.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/createRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/types.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/mergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/useMergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/useTransformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/assignRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/useRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/index.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/refToCallback.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/createRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/types.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/mergeRef.d.ts
Read supabase.ts
Agent:Explore API routes and invites
IN
Explore the API layer and judge/team invite system in this competition management platform. I need to understand:

1. Read all files in api/invites/ — judge.ts, team.ts, verify-judge.ts
2. Check server/src/routes/overviewPage.ts 
3. Check server/src/cache/redisCache.ts for caching patterns
4. Look at package.json for dependencies and tech stack
5. Check for any existing form management, public voting, or advancement logic anywhere in the codebase

Report back: the full tech stack, all API endpoints and their functionality, how judges/teams work currently, caching strategy, and what major features from the requirements (forms, public voting, advancement pipeline) are missing or partially built.
Read supabase.ts
Bash
IN
find /Users/nitish/awardco -type f -name "*.tsx" -o -name "*.ts" -o -name "*.json" | head -30

OUT
/Users/nitish/awardco/index.tsx
/Users/nitish/awardco/skills-lock.json
/Users/nitish/awardco/App.tsx
/Users/nitish/awardco/types/scheduleRounds.ts
/Users/nitish/awardco/types/roundExtensions.ts
/Users/nitish/awardco/types/overviewPage.ts
/Users/nitish/awardco/contexts/AuthContext.tsx
/Users/nitish/awardco/contexts/ProgramContext.tsx
/Users/nitish/awardco/vercel.json
/Users/nitish/awardco/node_modules/tinyglobby/package.json
/Users/nitish/awardco/node_modules/@alloc/quick-lru/package.json
/Users/nitish/awardco/node_modules/@alloc/quick-lru/index.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-time.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-interpolate.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/package.json
/Users/nitish/awardco/node_modules/victory-vendor/d3-scale.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-shape.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-timer.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-array.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-ease.d.ts
/Users/nitish/awardco/node_modules/tapable/tapable.d.ts
/Users/nitish/awardco/node_modules/tapable/package.json
/Users/nitish/awardco/node_modules/d3-format/locale/ar-SS.json
/Users/nitish/awardco/node_modules/d3-format/locale/ar-OM.json
/Users/nitish/awardco/node_modules/d3-format/locale/ar-MA.json
/Users/nitish/awardco/node_modules/d3-format/locale/ar-BH.json
/Users/nitish/awardco/node_modules/d3-format/locale/en-IN.json
/Users/nitish/awardco/node_modules/d3-format/locale/ar-IL.json
/Users/nitish/awardco/node_modules/d3-format/locale/ar-YE.json
/Users/nitish/awardco/node_modules/d3-format/locale/en-CA.json
Bash
IN
ls -la /Users/nitish/awardco/ | grep -E "^d"

OUT
drwxr-xr-x@  49 nitish  staff    1568 Apr  4 14:45 .
drwxr-x---+  62 nitish  staff    1984 Apr  4 14:30 ..
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:11 .agents
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:53 .claude
drwxr-xr-x@  13 nitish  staff     416 Apr  4 01:13 .git
drwxr-xr-x@   3 nitish  staff      96 Apr  3 16:05 .github
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:11 .vscode
drwxr-xr-x@  10 nitish  staff     320 Apr  3 16:05 api
drwxr-xr-x@  26 nitish  staff     832 Apr  4 00:08 components
drwxr-xr-x@   4 nitish  staff     128 Apr  3 16:05 contexts
drwxr-xr-x@   4 nitish  staff     128 Apr  4 01:08 dist
drwxr-xr-x@   6 nitish  staff     192 Apr  3 18:52 docs
drwxr-xr-x@   3 nitish  staff      96 Apr  3 16:05 env
drwxr-xr-x@   3 nitish  staff      96 Apr  3 17:26 hooks
drwxr-xr-x@   3 nitish  staff      96 Apr  4 00:09 lib
drwxr-xr-x@ 285 nitish  staff    9120 Apr  4 00:13 node_modules
drwxr-xr-x@  11 nitish  staff     352 Apr  4 00:42 server
drwxr-xr-x@  12 nitish  staff     384 Apr  3 22:54 services
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:58 src
drwxr-xr-x@   5 nitish  staff     160 Apr  3 16:05 supabase
drwxr-xr-x@   5 nitish  staff     160 Apr  3 16:05 tests
drwxr-xr-x@   5 nitish  staff     160 Apr  3 16:05 types
Bash
IN
ls -la /Users/nitish/awardco/components/ | head -40

OUT
total 264
drwxr-xr-x@ 26 nitish  staff    832 Apr  4 00:08 .
drwxr-xr-x@ 49 nitish  staff   1568 Apr  4 14:45 ..
-rw-r--r--@  1 nitish  staff   5440 Apr  3 16:05 AnalyticsPreview.tsx
-rw-r--r--@  1 nitish  staff   3443 Apr  3 16:05 AuthCallback.tsx
-rw-r--r--@  1 nitish  staff   1557 Apr  3 16:05 Button.tsx
-rw-r--r--@  1 nitish  staff   6541 Apr  3 16:05 ConfirmDialog.tsx
-rw-r--r--@  1 nitish  staff   3774 Apr  3 17:16 Drawer.tsx
-rw-r--r--@  1 nitish  staff   1553 Apr  3 16:05 EmptyState.tsx
-rw-r--r--@  1 nitish  staff   1226 Apr  3 16:05 ErrorBoundary.tsx
-rw-r--r--@  1 nitish  staff   3251 Apr  3 16:05 FeatureScroll.tsx
-rw-r--r--@  1 nitish  staff   8196 Apr  3 16:05 Features.tsx
-rw-r--r--@  1 nitish  staff   3796 Apr  3 16:05 Footer.tsx
-rw-r--r--@  1 nitish  staff  10088 Apr  3 16:05 Header.tsx
-rw-r--r--@  1 nitish  staff  11538 Apr  3 16:05 Hero.tsx
-rw-r--r--@  1 nitish  staff   4058 Apr  3 17:16 Modal.tsx
-rw-r--r--@  1 nitish  staff   5437 Apr  3 16:05 Pricing.tsx
-rw-r--r--@  1 nitish  staff  12166 Apr  3 16:05 ProductShowcase.tsx
-rw-r--r--@  1 nitish  staff    883 Apr  3 16:05 ProtectedRoute.tsx
-rw-r--r--@  1 nitish  staff    792 Apr  3 16:05 SkeletonLoader.tsx
-rw-r--r--@  1 nitish  staff   3332 Apr  3 16:05 Testimonials.tsx
-rw-r--r--@  1 nitish  staff   3197 Apr  3 16:05 Timeline.tsx
-rw-r--r--@  1 nitish  staff   6112 Apr  3 16:05 UseCases.tsx
-rw-r--r--@  1 nitish  staff   3414 Apr  3 16:05 UserHoverCard.tsx
drwxr-xr-x@ 33 nitish  staff   1056 Apr  3 23:02 dashboard
drwxr-xr-x@ 14 nitish  staff    448 Apr  3 17:27 pages
drwxr-xr-x@ 20 nitish  staff    640 Apr  4 00:17 ui
Read index.ts
Bash
IN
find /Users/nitish/awardco -type f -name "*.ts" -o -name "*.tsx" -o -name "*.json" | head -20

OUT
/Users/nitish/awardco/index.tsx
/Users/nitish/awardco/skills-lock.json
/Users/nitish/awardco/App.tsx
/Users/nitish/awardco/types/scheduleRounds.ts
/Users/nitish/awardco/types/roundExtensions.ts
/Users/nitish/awardco/types/overviewPage.ts
/Users/nitish/awardco/contexts/AuthContext.tsx
/Users/nitish/awardco/contexts/ProgramContext.tsx
/Users/nitish/awardco/vercel.json
/Users/nitish/awardco/node_modules/tinyglobby/package.json
/Users/nitish/awardco/node_modules/@alloc/quick-lru/package.json
/Users/nitish/awardco/node_modules/@alloc/quick-lru/index.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-time.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-interpolate.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/package.json
/Users/nitish/awardco/node_modules/victory-vendor/d3-scale.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-shape.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-timer.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-array.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-ease.d.ts
Bash
IN
ls -la /Users/nitish/awardco

OUT
total 1176
drwxr-xr-x@  49 nitish  staff    1568 Apr  4 14:45 .
drwxr-x---+  62 nitish  staff    1984 Apr  4 14:30 ..
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:11 .agents
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:53 .claude
-rw-r--r--@   1 nitish  staff     463 Apr  3 16:05 .env
drwxr-xr-x@  13 nitish  staff     416 Apr  4 01:13 .git
drwxr-xr-x@   3 nitish  staff      96 Apr  3 16:05 .github
-rw-r--r--@   1 nitish  staff     301 Apr  3 16:05 .gitignore
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:11 .vscode
-rw-r--r--@   1 nitish  staff    8401 Apr  3 16:05 App.tsx
-rw-r--r--@   1 nitish  staff   18551 Apr  4 01:32 JUDGING_AUDIT_REPORT.md
-rw-r--r--@   1 nitish  staff       4 Apr  3 16:05 README.md
-rw-r--r--@   1 nitish  staff    5057 Apr  3 16:05 SETUP.md
-rw-r--r--@   1 nitish  staff   35429 Apr  3 16:05 UXplan.md
-rw-r--r--@   1 nitish  staff   34388 Apr  3 16:05 UXtodo.md
drwxr-xr-x@  10 nitish  staff     320 Apr  3 16:05 api
drwxr-xr-x@  26 nitish  staff     832 Apr  4 00:08 components
-rw-r--r--@   1 nitish  staff     414 Apr  4 00:29 components.json
drwxr-xr-x@   4 nitish  staff     128 Apr  3 16:05 contexts
drwxr-xr-x@   4 nitish  staff     128 Apr  4 01:08 dist
drwxr-xr-x@   6 nitish  staff     192 Apr  3 18:52 docs
drwxr-xr-x@   3 nitish  staff      96 Apr  3 16:05 env
drwxr-xr-x@   3 nitish  staff      96 Apr  3 17:26 hooks
-rw-r--r--@   1 nitish  staff     386 Apr  3 16:05 index.html
-rw-r--r--@   1 nitish  staff    1601 Apr  3 17:16 index.tsx
drwxr-xr-x@   3 nitish  staff      96 Apr  4 00:09 lib
-rw-r--r--@   1 nitish  staff     157 Apr  3 16:05 metadata.json
drwxr-xr-x@ 285 nitish  staff    9120 Apr  4 00:13 node_modules
-rw-r--r--@   1 nitish  staff  371510 Apr  4 00:13 package-lock.json
-rw-r--r--@   1 nitish  staff    2239 Apr  4 00:13 package.json
-rw-r--r--@   1 nitish  staff    5348 Apr  3 16:05 plan.md
-rw-r--r--@   1 nitish  staff     692 Apr  3 16:05 playwright.config.ts
-rw-r--r--@   1 nitish  staff    5180 Apr  4 14:45 schedule.md
drwxr-xr-x@  11 nitish  staff     352 Apr  4 00:42 server
drwxr-xr-x@  12 nitish  staff     384 Apr  3 22:54 services
-rw-r--r--@   1 nitish  staff     246 Apr  3 22:11 skills-lock.json
drwxr-xr-x@   3 nitish  staff      96 Apr  3 22:58 src
drwxr-xr-x@   5 nitish  staff     160 Apr  3 16:05 supabase
-rw-r--r--@   1 nitish  staff    2123 Apr  3 22:58 tailwind.config.js
drwxr-xr-x@   5 nitish  staff     160 Apr  3 16:05 tests
-rw-r--r--@   1 nitish  staff    7326 Apr  3 16:05 todo.md
-rw-r--r--@   1 nitish  staff     638 Apr  3 16:05 tsconfig.json
drwxr-xr-x@   5 nitish  staff     160 Apr  3 16:05 types
-rw-r--r--@   1 nitish  staff     391 Apr  3 16:05 types.ts
-rw-r--r--@   1 nitish  staff   18139 Apr  3 16:05 uxprompt.md
-rw-r--r--@   1 nitish  staff     153 Apr  3 16:05 vercel.json
-rw-r--r--@   1 nitish  staff     755 Apr  3 16:05 vite-env.d.ts
-rw-r--r--@   1 nitish  staff    1252 Apr  3 22:29 vite.config.ts
-rw-r--r--@   1 nitish  staff     397 Apr  3 16:05 vitest.config.ts
Bash
IN
find /Users/nitish/awardco/components/dashboard -name "*.tsx" | head -30

OUT
/Users/nitish/awardco/components/dashboard/FormBuilderWithSelector.tsx
/Users/nitish/awardco/components/dashboard/JudgingView.tsx
/Users/nitish/awardco/components/dashboard/UniversalSearchPalette.tsx
/Users/nitish/awardco/components/dashboard/PublishedLockBanner.tsx
/Users/nitish/awardco/components/dashboard/ProgramTileHub.tsx
/Users/nitish/awardco/components/dashboard/AuditLogsView.tsx
/Users/nitish/awardco/components/dashboard/CategoriesWorkflow.tsx
/Users/nitish/awardco/components/dashboard/TeamsView.tsx
/Users/nitish/awardco/components/dashboard/ReachView.tsx
/Users/nitish/awardco/components/dashboard/Dashboard.tsx
/Users/nitish/awardco/components/dashboard/SubmissionProcessView.tsx
/Users/nitish/awardco/components/dashboard/ScheduleView.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/EdgeConfigurationPanel.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/ScheduleRoundsView.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/DataNode.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/RoundConfigurationPanel.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/ExtensionsMarketplaceModal.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/ContextMenu.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/ConnectionModal.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/RoundNode.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/WorkflowView.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/TileView.tsx
/Users/nitish/awardco/components/dashboard/scheduleRounds/OutputPortConfigModal.tsx
/Users/nitish/awardco/components/dashboard/AnalyticsView.tsx
/Users/nitish/awardco/components/dashboard/ProgramsList.tsx
/Users/nitish/awardco/components/dashboard/EventSelectionView.tsx
/Users/nitish/awardco/components/dashboard/CategoriesView.tsx
/Users/nitish/awardco/components/dashboard/SubmissionTable.tsx
/Users/nitish/awardco/components/dashboard/SettingsView.tsx
/Users/nitish/awardco/components/dashboard/CustomGridView.tsx
Bash
IN
find /Users/nitish/awardco/api -type f | sort

OUT
/Users/nitish/awardco/api/_utils/authUser.ts
/Users/nitish/awardco/api/_utils/logger.ts
/Users/nitish/awardco/api/_utils/rateLimit.ts
/Users/nitish/awardco/api/_utils/stripeConnect.ts
/Users/nitish/awardco/api/_utils/supabaseAdmin.ts
/Users/nitish/awardco/api/_utils/validation.ts
/Users/nitish/awardco/api/health.ts
/Users/nitish/awardco/api/invites/judge.ts
/Users/nitish/awardco/api/invites/team.ts
/Users/nitish/awardco/api/invites/verify-judge.ts
/Users/nitish/awardco/api/notifications/deadline-approaching.ts
/Users/nitish/awardco/api/notifications/judge-assigned.ts
/Users/nitish/awardco/api/notifications/new-submission.ts
/Users/nitish/awardco/api/payments/create-checkout.ts
/Users/nitish/awardco/api/payments/razorpay-verify.ts
/Users/nitish/awardco/api/payments/stripe-connect-start.ts
/Users/nitish/awardco/api/payments/stripe-connect-status.ts
/Users/nitish/awardco/api/submissions/my.ts
/Users/nitish/awardco/api/submissions/withdraw.ts
/Users/nitish/awardco/api/tsconfig.json
/Users/nitish/awardco/api/webhooks/stripe.ts
Grep "class DatabaseService|^\s{2}(async\s+\w+|readonly\s+\w+)" (in /Users/nitish/awardco/services/database.ts)
2 lines of output
Read package.json
Read scheduleRounds.ts
Read validation.ts
Read database.ts (lines 401-550)
Read ScheduleView.tsx
Bash
IN
find /Users/nitish/awardco -type f -name "*.ts" -o -name "*.tsx" | grep -E "(form|vote|voting|advancement|criteria|judg|score)" | head -20

OUT
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/useTransformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/useTransformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/useTransformRef.d.ts
/Users/nitish/awardco/node_modules/zod/src/v4/classic/tests/transform.test.ts
/Users/nitish/awardco/node_modules/zod/src/v4/classic/tests/string-formats.test.ts
/Users/nitish/awardco/node_modules/zod/src/v3/tests/transformer.test.ts
/Users/nitish/awardco/node_modules/@types/d3-format/index.d.ts
/Users/nitish/awardco/node_modules/@types/d3-time-format/index.d.ts
/Users/nitish/awardco/node_modules/@sentry/core/build/types/types-hoist/feedback/form.d.ts
/Users/nitish/awardco/node_modules/@sentry/core/build/types-ts3.8/types-hoist/feedback/form.d.ts
/Users/nitish/awardco/node_modules/es-toolkit/compat/conformsTo.d.ts
/Users/nitish/awardco/node_modules/es-toolkit/compat/transform.d.ts
/Users/nitish/awardco/node_modules/es-toolkit/compat/conforms.d.ts
/Users/nitish/awardco/node_modules/es-toolkit/dist/compat/_internal/ConformsPredicateObject.d.ts
/Users/nitish/awardco/node_modules/es-toolkit/dist/compat/predicate/conformsTo.d.ts
/Users/nitish/awardco/node_modules/es-toolkit/dist/compat/predicate/conforms.d.ts
/Users/nitish/awardco/node_modules/es-toolkit/dist/compat/object/transform.d.ts
Read scheduleRoundsDb.ts
Bash
IN
ls -la /Users/nitish/awardco/services/ | head -20

OUT
total 536
drwxr-xr-x@ 12 nitish  staff    384 Apr  3 22:54 .
drwxr-xr-x@ 49 nitish  staff   1568 Apr  4 14:45 ..
-rw-r--r--@  1 nitish  staff  66113 Apr  4 01:29 database.ts
-rw-r--r--@  1 nitish  staff  39372 Apr  3 16:05 database.types.ts
-rw-r--r--@  1 nitish  staff   1462 Apr  3 19:02 email.ts
-rw-r--r--@  1 nitish  staff   4842 Apr  4 01:29 models.ts
-rw-r--r--@  1 nitish  staff   1439 Apr  3 22:54 queryKeys.ts
-rw-r--r--@  1 nitish  staff  11589 Apr  3 16:05 scheduleRoundsDb.ts
-rw-r--r--@  1 nitish  staff    402 Apr  3 16:05 sentry.ts
-rw-r--r--@  1 nitish  staff  75881 Apr  4 01:16 supabase.ts
-rw-r--r--@  1 nitish  staff  20633 Apr  3 16:05 templateRoundConfigs.ts
-rw-r--r--@  1 nitish  staff  24664 Apr  3 16:05 workflowExtensions.ts
Globpattern: "**/*.tsx"
Found 94 files
Grep "^export const \w+ = " (in /Users/nitish/awardco/services/supabase.ts)
26 lines of output
Read JudgePortalPage.tsx
Bash
IN
grep -r "export const\|export interface\|export type" /Users/nitish/awardco/components/dashboard/*.tsx | grep -E "View|Modal|Component" | head -30

OUT
/Users/nitish/awardco/components/dashboard/AnalyticsView.tsx:export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/AuditLogsView.tsx:export const AuditLogsView: React.FC = () => {
/Users/nitish/awardco/components/dashboard/CategoriesView.tsx:export const CategoriesView: React.FC<CategoriesViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/CustomGridView.tsx:export const CustomGridView: React.FC = () => {
/Users/nitish/awardco/components/dashboard/EventSelectionView.tsx:export const EventSelectionView: React.FC<EventSelectionViewProps> = ({ onSelectEvent, onLogout }) => {
/Users/nitish/awardco/components/dashboard/FormBuilderView.tsx:export const FormBuilderView: React.FC<FormBuilderViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/JudgeScoringModal.tsx:export const JudgeScoringModal: React.FC<JudgeScoringModalProps> = ({
/Users/nitish/awardco/components/dashboard/JudgingView.tsx:export const JudgingView: React.FC<JudgingViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/ProgramDetailsView.tsx:export const ProgramDetailsView: React.FC<ProgramDetailsViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/ReachView.tsx:export const ReachView: React.FC = () => {
/Users/nitish/awardco/components/dashboard/ScheduleView.tsx:export const ScheduleView: React.FC<ScheduleViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/SettingsView.tsx:export const SettingsView: React.FC<SettingsViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/SubmissionDetailModal.tsx:export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({ isOpen, onClose, submission }) => {
/Users/nitish/awardco/components/dashboard/SubmissionProcessView.tsx:export const SubmissionProcessView: React.FC<SubmissionProcessViewProps> = ({ activeEvent }) => {
/Users/nitish/awardco/components/dashboard/TeamsView.tsx:export const TeamsView: React.FC<TeamsViewProps> = ({ activeEvent }) => {
Read auth.ts
Read my.ts
Read database.types.ts
Bash
IN
find /Users/nitish/awardco/services -type f -name "*.ts" | head -20

OUT
/Users/nitish/awardco/services/sentry.ts
/Users/nitish/awardco/services/workflowExtensions.ts
/Users/nitish/awardco/services/templateRoundConfigs.ts
/Users/nitish/awardco/services/email.ts
/Users/nitish/awardco/services/queryKeys.ts
/Users/nitish/awardco/services/database.types.ts
/Users/nitish/awardco/services/database.ts
/Users/nitish/awardco/services/models.ts
/Users/nitish/awardco/services/supabase.ts
/Users/nitish/awardco/services/scheduleRoundsDb.ts
Read database.types.ts (lines 151-550)
Read database.ts
Read database.types.ts (lines 551-1050)
Grep "voting|vote|advancement|advance|promote|winner|eligible" (in /Users/nitish/awardco/server/src/routes, type: ts)
1 line of output
Grep "^\s+(async|readonly)\s+\w+" (in /Users/nitish/awardco/services/database.ts)
81 lines of output
Grep "vote|Voting" (in /Users/nitish/awardco/services/models.ts)
4 lines of output
Grep "^\s+\w+:" (in /Users/nitish/awardco/types/scheduleRounds.ts)
31 lines of output
Read database.ts (lines 1051-1150)
Bash
IN
ls -la /Users/nitish/awardco/api/

OUT
total 16
drwxr-xr-x@ 10 nitish  staff   320 Apr  3 16:05 .
drwxr-xr-x@ 49 nitish  staff  1568 Apr  4 14:45 ..
drwxr-xr-x@  8 nitish  staff   256 Apr  3 16:05 _utils
-rw-r--r--@  1 nitish  staff   176 Apr  3 16:05 health.ts
drwxr-xr-x@  5 nitish  staff   160 Apr  3 16:05 invites
drwxr-xr-x@  5 nitish  staff   160 Apr  3 16:05 notifications
drwxr-xr-x@  6 nitish  staff   192 Apr  3 16:05 payments
drwxr-xr-x@  4 nitish  staff   128 Apr  3 16:05 submissions
-rw-r--r--@  1 nitish  staff   260 Apr  3 16:05 tsconfig.json
drwxr-xr-x@  3 nitish  staff    96 Apr  3 16:05 webhooks
Grep "round_edges|program_page|program_forms|program_templates" (in /Users/nitish/awardco/services/database.types.ts)
2 lines of output
Bash
IN
grep -r "Round\|Voting\|Judging" /Users/nitish/awardco/types --include="*.ts" | head -20

OUT
/Users/nitish/awardco/types/scheduleRounds.ts:// Core Data Models for Schedule & Rounds Workflow Engine
/Users/nitish/awardco/types/scheduleRounds.ts:type RoundType = 'Nomination' | 'Shortlisting' | 'Public Voting' | 'Public Rating' | 'Announce' | 'jury' | 'public' | 'hybrid' | 'compliance' | 'custom';
/Users/nitish/awardco/types/scheduleRounds.ts:export default RoundType;
/Users/nitish/awardco/types/scheduleRounds.ts:export interface Round {
/Users/nitish/awardco/types/scheduleRounds.ts:  type: RoundType;
/Users/nitish/awardco/types/scheduleRounds.ts:export interface RoundEdge {
/Users/nitish/awardco/types/scheduleRounds.ts:  sourceRoundId: string;
/Users/nitish/awardco/types/scheduleRounds.ts:  targetRoundId: string;
/Users/nitish/awardco/types/scheduleRounds.ts:export interface RoundWorkflow {
/Users/nitish/awardco/types/scheduleRounds.ts:  rounds: Round[];
/Users/nitish/awardco/types/scheduleRounds.ts:  edges: RoundEdge[];
/Users/nitish/awardco/types/scheduleRounds.ts:export interface RoundAuditLog {
/Users/nitish/awardco/types/roundExtensions.ts:import { Round, RoundEdge } from './scheduleRounds';
/Users/nitish/awardco/types/roundExtensions.ts:export type TemplateRoundId = string;
/Users/nitish/awardco/types/roundExtensions.ts:  | { type: 'after_previous'; roundId: TemplateRoundId }
/Users/nitish/awardco/types/roundExtensions.ts:export type RoundTemplate = Omit<
/Users/nitish/awardco/types/roundExtensions.ts:  Round,
/Users/nitish/awardco/types/roundExtensions.ts:  templateId: TemplateRoundId;
/Users/nitish/awardco/types/roundExtensions.ts:export type RoundEdgeTemplate = Omit<
/Users/nitish/awardco/types/roundExtensions.ts:  RoundEdge,
Read database.types.ts (lines 1201-1500)
Read scheduleRounds.ts
Bash
IN
find /Users/nitish/awardco -name "*submit*" -o -name "*form*" | grep -E "\.(ts|tsx)$" | grep -v node_modules | head -15

OUT
(Bash completed with no output)
Read SubmissionTable.tsx
Bash
IN
find /Users/nitish/awardco -maxdepth 1 -name "*.md" -exec basename {} \;

OUT
uxprompt.md
UXplan.md
SETUP.md
JUDGING_AUDIT_REPORT.md
schedule.md
todo.md
README.md
plan.md
UXtodo.md
Read package.json
Bash
IN
head -150 /Users/nitish/awardco/UXtodo.md

OUT
<!-- markdownlint-disable -->

# UX Todo
_Generated from UX analysis on 2026-04-02. Work top-to-bottom within each priority tier._
_Check off items as completed. Move done items to the Completed section at the bottom._

## Priority Key
| Symbol | Meaning | Do when... |
|--------|---------|------------|
| Critical | Now — blocks users or destroys trust |
| High | This sprint — significant friction |
| Medium | Next sprint — noticeable improvement |
| Low | Backlog — polish when bandwidth allows |

## Effort Key
| Tag | Estimate |
|-----|----------|
| [XS] | Under 2 hours |
| [S] | Half day |
| [M] | 1 day |
| [L] | 2–3 days |
| [XL] | 1 week |

---

## Critical

- [ ] **Add focus trap to Modal component** [XS]
  - **File(s)**: `components/Modal.tsx`
  - **Problem**: Modals have no focus trap — Tab key moves focus behind the modal to underlying page elements. Every modal in the app inherits this flaw. Violates WCAG 2.1.2.
  - **Fix**: Add a focus trap using a `useEffect` hook: on open, query all focusable elements inside the modal, trap Tab/Shift+Tab to cycle within them, and return focus to the trigger element on close. Use a library like `focus-trap-react` or implement manually with `document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')`.
  - **Done when**: Focus cannot leave the modal via keyboard while it's open; focus returns to the triggering element on close.

- [ ] **Add ARIA attributes to Modal** [XS]
  - **File(s)**: `components/Modal.tsx`
  - **Problem**: Modal is missing `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Screen readers don't announce it as a dialog or read the title.
  - **Fix**: Add `role="dialog"` and `aria-modal="true"` to the modal container `<div>`. Add an `id` to the `<h3>` title (e.g., `id="modal-title"`) and reference it with `aria-labelledby="modal-title"` on the dialog. Add `aria-label="Close"` to the X close button.
  - **Done when**: Screen reader announces "dialog" when modal opens, reads the title, and close button has an accessible name.

- [ ] **Add Escape key handler to Modal** [XS]
  - **File(s)**: `components/Modal.tsx`
  - **Problem**: Pressing Escape does nothing when a modal is open. Users expect Escape to close dialogs.
  - **Fix**: Add `useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, [onClose]);`
  - **Done when**: Pressing Escape closes any open modal.

- [ ] **Replace all `window.confirm` with ConfirmDialog component** [S]
  - **File(s)**: `components/dashboard/FormBuilderView.tsx`, `components/dashboard/SubmissionTable.tsx`, `components/dashboard/JudgingView.tsx`, `components/dashboard/CategoriesView.tsx`, `components/dashboard/TeamsView.tsx`
  - **Problem**: Destructive actions (delete form, delete submission, remove judge, remove category, remove team member) use `window.confirm()` — ugly browser-native dialog, breaks design consistency, cannot be styled, can be blocked in some environments.
  - **Fix**: Create a reusable `ConfirmDialog` component that extends Modal with: title, description, confirm button (red for destructive), cancel button, and loading state. Replace every `window.confirm` call. The description should be specific: "Delete form 'Application Form'? This removes all fields. Existing submissions are not affected."
  - **Done when**: Zero `window.confirm` calls in the codebase; all destructive actions use the styled ConfirmDialog.

- [ ] **Build complete Judge Portal scoring interface** [XL]
  - **File(s)**: `components/pages/JudgePortalPage.tsx` (expand significantly)
  - **Problem**: The judge portal verifies the invite token and loads program/submission data, but the actual judging interface — submission viewer, scoring form, comments, progress tracking — is not rendered. Judges literally cannot do their job.
  - **Fix**: Build the judge portal with: (1) Overview page showing assigned submissions count, criteria, deadline; (2) Submission list with completion status; (3) Submission detail view showing all form responses, files, images; (4) Scoring form with one input per criterion (respecting min/max/weight from `judging_criteria`); (5) Comment textarea for overall feedback + recommendation dropdown (accept/reject/maybe); (6) Save draft + Submit final review actions; (7) Progress indicator showing "3 of 8 reviewed".
  - **Done when**: A judge can access the portal, view all assigned submissions, score each against criteria, leave comments, save progress, and submit final reviews.

- [ ] **Add authentication to notification endpoints** [S]
  - **File(s)**: `api/notifications/new-submission.ts`, `api/notifications/judge-assigned.ts`, `api/notifications/deadline-approaching.ts`
  - **Problem**: These endpoints create notification records for organization members but require no authentication. Anyone who guesses a valid `organizationId` UUID can spam fake notifications.
  - **Fix**: Add Bearer token authentication using `getAuthenticatedUser()`. Verify the authenticated user is a member of the specified organization before creating notifications. Return 401 if no token, 403 if not an org member.
  - **Done when**: All notification endpoints require authentication and org membership verification.

- [ ] **Add inline form validation to submission forms** [L]
  - **File(s)**: `components/pages/FormSubmissionPage.tsx`
  - **Problem**: Multi-page submission forms only validate on final submit. Users fill out entire forms before discovering errors. On multi-page forms, errors on page 1 aren't caught until the user hits Submit on page 5.
  - **Fix**: Implement validation on page change and on blur: (1) On blur, validate the field (required, min/max length, pattern); (2) Show error below the field in red with descriptive message; (3) On "Next page", validate all fields on current page — prevent navigation if errors; (4) Mark errored fields with red border + error message; (5) On final submit, validate all pages.
  - **Done when**: Users see validation errors immediately on blur and cannot advance pages with invalid fields.

---

## High Priority

- [ ] **Add empty states to all dashboard views** [M]
  - **File(s)**: `components/dashboard/DashboardOverview.tsx`, `components/dashboard/SubmissionTable.tsx`, `components/dashboard/JudgingView.tsx`, `components/dashboard/CategoriesView.tsx`, `components/dashboard/FormBuilderView.tsx`, `components/dashboard/AnalyticsView.tsx`
  - **Problem**: New users with no data see zeroed stat cards, empty tables, and no guidance. The product feels broken. There's no indication of what to do next.
  - **Fix**: Create a shared `EmptyState` component with: icon, headline, description, and CTA button. Apply to each view with specific messaging:
    - Submissions: "No submissions yet" → "Share your form link to start collecting entries" → [Copy Form Link]
    - Judges: "No judges assigned" → "Invite judges to review submissions" → [Invite Judge]
    - Categories: "No categories created" → "Organize entries into award categories" → [Add Category]
    - Forms: "No forms yet" → "Build a submission form for applicants" → [Create Form]
    - Analytics: "Not enough data" → "Analytics will appear as submissions come in"
  - **Done when**: Every list/table view has a designed empty state with contextual help text and a CTA.

- [ ] **Humanize error messages across auth flows** [S]
  - **File(s)**: `components/pages/LoginPage.tsx`, `components/pages/SignupPage.tsx`, `components/AuthCallback.tsx`
  - **Problem**: Raw Supabase error strings like "Invalid login credentials" or "User already registered" are shown directly to users. These are technical and sometimes confusing.
  - **Fix**: Create an `authErrorMessages` map that translates common Supabase error messages to friendly alternatives:
    - "Invalid login credentials" → "That email and password combination doesn't match. Check your spelling or reset your password."
    - "User already registered" → "An account with this email already exists. Try logging in instead."
    - "Email not confirmed" → "Please check your email and click the confirmation link we sent."
    - Default: "Something went wrong. Please try again or contact support."
  - **Done when**: No raw Supabase error strings are visible to users on login, signup, or OAuth callback pages.

- [ ] **Add loading indicators to bulk actions** [S]
  - **File(s)**: `components/dashboard/SubmissionTable.tsx`, `components/dashboard/JudgingView.tsx`
  - **Problem**: Bulk actions (delete selected, assign judges, change status) execute with no visual loading feedback. Users click, see nothing, click again — causing double-execution.
  - **Fix**: Add `isProcessing` state to each bulk action. While processing: (1) disable the action button, (2) show a spinner inside the button, (3) prevent additional clicks. On completion, show success toast. On error, show error toast and re-enable button.
  - **Done when**: Every bulk action shows a loading spinner in the button, disables interaction during processing, and shows success/error feedback.

- [ ] **Fix UserHoverCard hardcoded placeholder data** [XS]
  - **File(s)**: `components/UserHoverCard.tsx`
  - **Problem**: Location is hardcoded to "San Francisco, CA" and join date to "Joined Oct 2024" for every user. The Message and View Profile buttons have no handlers. The email fallback is a placeholder.
  - **Fix**: Remove the hardcoded location line (it's not stored in the profiles table). Calculate join date from the user's `created_at` field. Remove or disable the non-functional buttons (Message, View Profile, External Link). Use actual email from user prop or hide the field.
  - **Done when**: UserHoverCard shows only real data; no hardcoded placeholders; non-functional buttons removed.

- [ ] **Increase success message display duration** [XS]
  - **File(s)**: `components/dashboard/FormBuilderView.tsx`, `components/dashboard/SettingsView.tsx`
  - **Problem**: Success messages auto-dismiss after 3 seconds. Many users, especially those with cognitive disabilities or slow readers, miss them entirely.
  - **Fix**: Increase auto-dismiss to 5 seconds minimum. Add a visible dismiss button (X) so users can close manually. For important actions (save, delete), keep the message until the user takes another action.
  - **Done when**: Success messages display for at least 5 seconds and can be manually dismissed.

- [ ] **Fix non-functional formatting toolbar in SubmissionProcessView** [S]
  - **File(s)**: `components/dashboard/SubmissionProcessView.tsx`
  - **Problem**: The Rich text toolbar buttons (Bold, Italic, Underline, H1, H2) render in the guidelines editor but have no click handlers. They appear functional but do nothing.
  - **Fix**: Either implement the rich text formatting using `contentEditable` or a lightweight library (e.g., `tiptap`), or replace the toolbar with a plain `<textarea>` with markdown instructions. Don't ship non-functional buttons.
  - **Done when**: Formatting buttons either work correctly or the editor is a plain textarea with no misleading toolbar.

- [ ] **Remove or fix non-functional UI elements** [S]
  - **File(s)**: `components/dashboard/DashboardOverview.tsx` ("Last 7 Days" dropdown), `components/dashboard/ReachView.tsx` (social connect buttons, trigger toggles), `components/dashboard/AuditLogsView.tsx` (filter buttons)
  - **Problem**: Multiple interactive elements appear functional but do nothing: the "Last 7 Days" time range selector, social media connect buttons, smart trigger toggles, and audit log filter buttons. Each one damages trust.
  - **Fix**: For each non-functional element, either: (1) implement the functionality, or (2) remove it from the UI, or (3) disable it with a tooltip "Coming soon" — but only if it's genuinely planned.
  - **Done when**: Every visible interactive element either works or is clearly marked as upcoming.

- [ ] **Add skip-to-content link** [XS]
  - **File(s)**: `components/dashboard/DashboardLayout.tsx`, `components/Header.tsx`
  - **Problem**: No skip link exists. Keyboard users must tab through the entire sidebar/header navigation on every page load.
  - **Fix**: Add `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-3 focus:rounded-lg focus:shadow-lg focus:text-indigo-600 focus:font-semibold">Skip to content</a>` as the first element in the layout. Add `id="main-content"` to the `<main>` element.
  - **Done when**: Pressing Tab on page load reveals "Skip to content" link; activating it moves focus to the main content area.

- [ ] **Add status icons alongside color badges** [XS]
  - **File(s)**: `components/dashboard/SubmissionTable.tsx`, `components/dashboard/SubmissionDetailModal.tsx`, `components/pages/MySubmissionsPage.tsx`
  - **Problem**: Submission status badges use color alone: green for accepted, red for rejected, amber for pending, etc. Users with color vision deficiency cannot distinguish them. Violates WCAG 1.4.1.
  - **Fix**: Add icons alongside each status label: pending → Clock icon, under_review → Eye icon, shortlisted → Star icon, accepted → CheckCircle icon, rejected → XCircle icon, withdrawn → MinusCircle icon. Icons should be from Lucide (already in project).
  - **Done when**: Every status badge includes both a color and an icon; status is discernible without color.

- [ ] **Implement password reset flow** [M]
  - **File(s)**: `components/pages/LoginPage.tsx` (link), new `components/pages/ForgotPasswordPage.tsx`, new `components/pages/ResetPasswordPage.tsx`, `App.tsx` (routes)
  - **Problem**: "Forgot password?" on the login page is `href="#"` — clicking it does nothing. Users who forget their password have no self-service recovery.
  - **Fix**: Create ForgotPasswordPage with email input → calls `auth.resetPassword(email)` → shows "Check your email" message. Create ResetPasswordPage that handles the Supabase reset callback → new password form → success redirect to login. Add routes `/forgot-password` and `/reset-password` to App.tsx.
  - **Done when**: Full password reset flow works: forgot password → email sent → click link → set new password → login.

---

## Medium Priority

- [ ] **Remove disabled OAuth buttons from login/signup** [XS]
  - **File(s)**: `components/pages/LoginPage.tsx:216-231`, `components/pages/SignupPage.tsx`
  - **Problem**: Apple and LinkedIn OAuth buttons are permanently disabled with only a "Coming soon" title tooltip. They clutter the interface and reduce confidence.
  - **Fix**: Remove the disabled Apple and LinkedIn buttons entirely. Keep only the Google OAuth button. If/when Apple and LinkedIn are supported, add them back.
Bash
IN
find /Users/nitish/awardco/components -name "*Voting*" -o -name "*Public*" | head -10

OUT
/Users/nitish/awardco/components/pages/PublicProgramPage.tsx
Read index.ts
Bash
IN
ls -la /Users/nitish/awardco/components/ui/ | head -20

OUT
total 232
drwxr-xr-x@ 20 nitish  staff    640 Apr  4 00:17 .
drwxr-xr-x@ 26 nitish  staff    832 Apr  4 00:08 ..
-rw-r--r--@  1 nitish  staff   1418 Apr  4 00:29 avatar.tsx
-rw-r--r--@  1 nitish  staff   1098 Apr  4 00:29 badge.tsx
-rw-r--r--@  1 nitish  staff   2618 Apr  4 00:29 breadcrumb.tsx
-rw-r--r--@  1 nitish  staff   1835 Apr  4 00:29 button.tsx
-rw-r--r--@  1 nitish  staff   8396 Apr  4 00:29 demo.tsx
-rw-r--r--@  1 nitish  staff   9030 Apr  4 00:29 dropdown-menu.tsx
-rw-r--r--@  1 nitish  staff   1252 Apr  4 00:29 input.tsx
-rw-r--r--@  1 nitish  staff    572 Apr  4 00:29 navigation-bar.tsx
-rw-r--r--@  1 nitish  staff  17943 Apr  4 00:29 navigation-menu-4.tsx
-rw-r--r--@  1 nitish  staff   5059 Apr  4 00:29 navigation-menu.tsx
-rw-r--r--@  1 nitish  staff   5054 Apr  4 00:29 origin-navigation-menu.tsx
-rw-r--r--@  1 nitish  staff   1675 Apr  4 00:29 origin-popover.tsx
-rw-r--r--@  1 nitish  staff   1244 Apr  4 00:29 popover.tsx
-rw-r--r--@  1 nitish  staff   1656 Apr  4 00:29 scroll-area.tsx
-rw-r--r--@  1 nitish  staff   5777 Apr  4 00:29 select.tsx
-rw-r--r--@  1 nitish  staff    770 Apr  4 00:29 separator.tsx
-rw-r--r--@  1 nitish  staff   1449 Apr  4 00:29 toggle.tsx
Bash
IN
grep -r "submitScores\|vote\|scoring" /Users/nitish/awardco/services/database.ts -A 5 | head -80

OUT
/Users/nitish/awardco/services/database.ts:    scoring_system?: string;
/Users/nitish/awardco/services/database.ts-    pass_threshold?: number;
/Users/nitish/awardco/services/database.ts-    blind_judging?: boolean;
/Users/nitish/awardco/services/database.ts-    allow_comments?: boolean;
/Users/nitish/awardco/services/database.ts-    auto_assign?: boolean;
/Users/nitish/awardco/services/database.ts-    max_judges_per_submission?: number;
--
/Users/nitish/awardco/services/database.ts:  async vote(submissionId: string) {
/Users/nitish/awardco/services/database.ts:    const { data, error } = await submissions.vote(submissionId);
/Users/nitish/awardco/services/database.ts:    if (error) throw new Error(error.message || 'Failed to cast vote');
/Users/nitish/awardco/services/database.ts-
/Users/nitish/awardco/services/database.ts-    await this.safeAuditLog({
/Users/nitish/awardco/services/database.ts:      action: 'Cast public vote',
/Users/nitish/awardco/services/database.ts-      actionType: 'update',
/Users/nitish/awardco/services/database.ts-      resourceType: 'submission',
/Users/nitish/awardco/services/database.ts-      resourceId: submissionId,
/Users/nitish/awardco/services/database.ts:      details: 'Public vote cast',
/Users/nitish/awardco/services/database.ts-    });
/Users/nitish/awardco/services/database.ts-
/Users/nitish/awardco/services/database.ts-    return data;
/Users/nitish/awardco/services/database.ts-  }
/Users/nitish/awardco/services/database.ts-
--
/Users/nitish/awardco/services/database.ts:      votes: s.votes_count || s.submission_data?.votes || 0,
/Users/nitish/awardco/services/database.ts-      submissionData: s.submission_data || {},
/Users/nitish/awardco/services/database.ts-    };
/Users/nitish/awardco/services/database.ts-  }
/Users/nitish/awardco/services/database.ts-
/Users/nitish/awardco/services/database.ts-
--
/Users/nitish/awardco/services/database.ts:  async submitScores(
/Users/nitish/awardco/services/database.ts-    submissionJudgeId: string,
/Users/nitish/awardco/services/database.ts-    criteriaScores: { criterionId: string; score: number; comment?: string }[],
/Users/nitish/awardco/services/database.ts-    overallComment?: string,
/Users/nitish/awardco/services/database.ts-  ): Promise<void> {
/Users/nitish/awardco/services/database.ts-    if (!supabase) throw new Error('Supabase not configured');
Good exploration. Now let me design the implementation plan.

Agent:Design implementation plan
IN
I need a detailed implementation plan for a competition management platform. Here's what exists and what needs to be built.

## Current State

**Tech Stack**: React 19, TypeScript, Vite, Supabase (PostgreSQL + Auth), Express backend, Redis caching, React Query v5, Tailwind CSS, Radix UI, React Flow for workflow visualization.

**What's Already Built (key files)**:
- 46 database tables including: `rounds`, `round_edges`, `submissions`, `judges`, `submission_judges`, `scores`, `judge_comments`, `judging_criteria`, `program_forms`, `program_form_fields`, `categories`, `audit_logs`
- Round types defined in `types/scheduleRounds.ts` with ShortlistConfig, EdgeCondition types
- Database service at `services/database.ts` (~2100 lines) with CRUD for programs, submissions, judges, scores, forms, categories
- Schedule rounds routes at `server/src/routes/scheduleRounds.ts` with CRUD for rounds and DAG edges
- Full dashboard with views: SubmissionTable, JudgingView, ScheduleRoundsView (advanced workflow builder with tile view + edges), FormBuilderView, TeamsView, CategoriesView, AnalyticsView, AuditLogsView
- Judge portal at `components/pages/JudgePortalPage.tsx` (token-based, loads assignments/criteria)
- JudgeScoringModal with per-criterion scoring, weighted calculation, comments
- `db.vote(submissionId)` method exists but no UI
- Submission status enum: pending → under_review → shortlisted → accepted → rejected
- `db.assignJudgesToSubmissions()` exists for basic assignment

**What's Missing (from requirements in schedule.md)**:

### 1. Form Management Gaps
- Forms are ~70% built. Need: form activation/selection per competition (linking active form to program), ensuring nominations flow into round pipeline.

### 2. Schedule & Rounds - Round Execution Engine
- Rounds exist as data (CRUD, DAG edges) but NO execution logic
- Need: Round status transitions (upcoming → active → completed), automatic activation based on start dates, round type behavior enforcement (Judging Round → judges score, Public Voting Round → public votes, Screening Round → admin shortlists)

### 3. Judge Assignment Strategies  
- Basic `assignJudgesToSubmissions()` exists
- Need three strategies:
  - **Auto Random**: Random distribution among available judges
  - **Auto Segmented**: Distribution by category/region/segments
  - **Manual**: Admin picks specific judge-submission pairs

### 4. Public Voting System (0% built)
- Need: Public voting page/component, voting configuration per round (window, limits, auth requirements), vote tracking, real-time results for admin, leaderboard

### 5. Advancement Pipeline (0% built, types exist)
- Need advancement criteria options: Top N, Top N%, Score Threshold, Manual Selection, All Pass
- Need advancement triggers: Manual (admin preview + confirm + override) and Automatic Timer (on round end)
- Need advancement execution: enroll qualifying participants in next round, carry forward data/scores, mark eliminated with reason
- Edge cases: pause if no scores, tie resolution prompt, round ordering enforcement

### 6. Admin Control Enhancements
- Monitor live progress across all rounds
- Override/adjust assignments or votes
- Full advancement history view

## Requirements (from schedule.md)

The system needs these 6 modules working as a connected pipeline: Form → Nominations → Schedule → Rounds → Judging/Voting → Advancement

Key principles:
- All modules connected in single data pipeline
- No round proceeds without nominations collected first
- Role-based access (Admin sees all, Judges see assigned only, Public sees voting only)
- Every action logged and auditable
- Rounds are fully dynamic, no hardcoded structure
- Advancement criteria: Top N, Top N%, Score Threshold, Manual Selection, All Pass
- Advancement triggers: Manual (with preview/override) and Automatic Timer
- Edge cases: empty scores pause auto-trigger, ties prompt admin, rounds sequential

Please design a phased implementation plan that:
1. Prioritizes the connected data pipeline (form → nominations → rounds → judging/voting → advancement)
2. Builds on existing code patterns and services
3. Identifies exactly which files need modification vs creation
4. Covers database changes needed (new columns, tables, or Supabase functions)
5. Addresses the advancement pipeline in detail (this is the most complex new feature)
6. Includes public voting as a complete feature

Structure the plan in implementation phases ordered by dependency.
Bash Find TypeScript files to understand project structure
IN
find /Users/nitish/awardco -type f -name "*.ts" -o -name "*.tsx" | head -80

OUT
/Users/nitish/awardco/index.tsx
/Users/nitish/awardco/App.tsx
/Users/nitish/awardco/types/scheduleRounds.ts
/Users/nitish/awardco/types/roundExtensions.ts
/Users/nitish/awardco/types/overviewPage.ts
/Users/nitish/awardco/contexts/AuthContext.tsx
/Users/nitish/awardco/contexts/ProgramContext.tsx
/Users/nitish/awardco/node_modules/@alloc/quick-lru/index.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-time.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-interpolate.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-scale.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-shape.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-timer.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-array.d.ts
/Users/nitish/awardco/node_modules/victory-vendor/d3-ease.d.ts
/Users/nitish/awardco/node_modules/tapable/tapable.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/createRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/types.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/mergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/useMergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/useTransformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/assignRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/useRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/index.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es5/refToCallback.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/createRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/types.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/mergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/useMergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/useTransformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/assignRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/useRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/index.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2019/refToCallback.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/createRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/transformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/types.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/mergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/useMergeRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/useTransformRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/assignRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/useRef.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/index.d.ts
/Users/nitish/awardco/node_modules/use-callback-ref/dist/es2015/refToCallback.d.ts
/Users/nitish/awardco/node_modules/zod/v4-mini/index.d.ts
/Users/nitish/awardco/node_modules/zod/locales/index.d.ts
/Users/nitish/awardco/node_modules/zod/mini/index.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ua.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/hy.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/sl.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/mk.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/tr.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ps.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/is.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/lt.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/hu.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/yo.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ms.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/nl.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ja.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/uk.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ru.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/pl.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/de.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/fi.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/eo.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ta.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/zh-CN.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ur.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/be.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/pt.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/az.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/en.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/ka.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/km.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/it.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/fr-CA.d.ts
/Users/nitish/awardco/node_modules/zod/v4/locales/fr.d.ts
Globpattern: "**/*.{ts,tsx}"
Found 101 files
Read database.types.ts
Read JudgePortalPage.tsx
Bash List server source files
IN
find /Users/nitish/awardco/server/src -type f -name "*.ts" -not -path "*/node_modules/*" 2>/dev/null

OUT
/Users/nitish/awardco/server/src/middleware/auth.ts
/Users/nitish/awardco/server/src/cache/redisCache.ts
/Users/nitish/awardco/server/src/index.ts
/Users/nitish/awardco/server/src/supabase.ts
/Users/nitish/awardco/server/src/routes/scheduleRounds.ts
/Users/nitish/awardco/server/src/routes/organizations.ts
/Users/nitish/awardco/server/src/routes/programs.ts
/Users/nitish/awardco/server/src/routes/overviewPage.ts
/Users/nitish/awardco/server/src/routes/index.ts
/Users/nitish/awardco/server/src/routes/auth.ts
Read App.tsx
Grep "program_forms|program_form_fields|round_participants|round_submissions|advancement" (in /Users/nitish/awardco, glob: **/*.{ts,tsx,sql})
53 lines of output
Bash Check current DB schema size
IN
wc -l /Users/nitish/awardco/supabase/currentdb.sql

OUT
     770 /Users/nitish/awardco/supabase/currentdb.sql
Read currentdb.sql (lines 301-550)
Read currentdb.sql (lines 551-770)
Read database.ts (lines 1191-1240)
Grep "ScheduleRoundsView|JudgingView|AnalyticsView" (in /Users/nitish/awardco/components)
6 lines of output
Read JudgingView.tsx
Read supabase.ts
Read database.ts (lines 1771-1850)
Bash List migration files
IN
ls /Users/nitish/awardco/supabase/migrations/

OUT
001_rls_policies.sql
002_realtime_notifications.sql
003_search_and_indexes.sql
004_payments_multigateway.sql
005_current_iteration_consolidated.sql
006_hotfix_org_members_rls.sql
Grep "export const queryKeys" (in /Users/nitish/awardco/services)
2 lines of output
Read models.ts
Read ScheduleRoundsView.tsx
Let me verify a few key assumptions before writing the final plan.

Grep "round_submissions|round_transitions|public_votes|voting_configs|advancement" (in /Users/nitish/awardco, glob: *.sql)
3 lines of output
Grep "round_submissions|public_votes|votes_count" (in /Users/nitish/awardco/services)
6 lines of output
Read scheduleRounds.ts
Grep "public_votes|round_transitions|round_submissions" (in /Users/nitish/awardco/supabase/currentdb.sql)
8 lines of output
Good — public_votes and round_transitions tables already exist. Now let me write the final plan.

Write wobbly-coalescing-finch.md
157 lines
# Competition Management System — Implementation Plan

## Context

The platform has strong foundations (46 DB tables, full CRUD, dashboard, judging, forms, schedule DAG) but the **execution pipeline** is missing. Rounds exist as static data — nothing connects form submissions to rounds, triggers judging/voting behavior, or advances participants between rounds. This plan builds the connected pipeline: **Form → Nominations → Rounds → Judging/Voting → Advancement**.

---

## Phase 1: Form-to-Round Pipeline (Foundation)

**Why**: Submissions must flow into the first round automatically. Nothing else works without this.

### DB Changes
- Add `active_form_id` column to `programs` table
- Create `round_submissions` junction table (round_id, submission_id, status: active/advanced/eliminated, enrolled_at, advanced_at, eliminated_at, elimination_reason, source_round_id, carried_score)

### Files to Modify
- `supabase/currentdb.sql` — add migration SQL
- `services/database.ts` — modify `submitFormResponse()` to auto-enroll submission in first round (find root node via `round_edges`); add `getActiveFormForProgram()`, `setActiveFormForProgram()`
- `services/supabase.ts` — add `round_submissions` CRUD helpers
- `services/database.types.ts` — add `round_submissions` type
- `server/src/routes/scheduleRounds.ts` — add `PUT /:programId/active-form` endpoint
- `services/queryKeys.ts` — add `roundSubmissions` keys

### Files to Create
- `supabase/migrations/007_round_pipeline.sql`

---

## Phase 2: Round Execution Engine

**Why**: Rounds need lifecycle management — status transitions, validation guards, and auto-activation/completion.

### DB Changes
- Add to `rounds` table: `advancement_criteria` (jsonb), `advancement_trigger` (varchar: manual/automatic), `is_finalized` (boolean)

### Types to Add (`types/scheduleRounds.ts`)
```ts
export type AdvancementCriteria =
  | { type: 'top_n'; value: number }
  | { type: 'top_percent'; value: number }
  | { type: 'score_threshold'; value: number }
  | { type: 'manual' }
  | { type: 'all_pass' };
export type AdvancementTrigger = 'manual' | 'automatic';
```

### Files to Create
- `server/src/services/roundEngine.ts` — state machine: `activateRound()`, `completeRound()`, `finalizeRound()` with guards (can't activate without finalized predecessor, can't activate with 0 submissions). Logs to existing `round_transitions` table.
- `server/src/routes/roundExecution.ts` — `POST /rounds/:id/activate`, `POST /rounds/:id/complete`, `POST /rounds/:id/finalize`, `GET /rounds/:id/status`, `GET /programs/:id/pipeline-status`
- `server/src/jobs/roundScheduler.ts` — interval job: auto-activate rounds past start_date, auto-complete rounds past end_date, trigger auto-advancement for completed rounds

### Files to Modify
- `server/src/routes/index.ts` — mount new routes
- `components/dashboard/scheduleRounds/` (TileView, RoundNode, RoundConfigurationPanel) — status badges, enrolled counts, activate/complete buttons, advancement config UI

---

## Phase 3: Judge Assignment Strategies

**Why**: Requirements specify three strategies: Auto Random, Auto Segmented, Manual.

### DB Changes
- Add `round_id` (nullable) to `submission_judges` — assignments are per-round
- Add `round_id` (nullable) to `judging_criteria` — criteria can be round-scoped

### Files to Create
- `server/src/services/judgeAssignment.ts` — three strategies:
  - `autoRandom(roundId, judgesPerSubmission)` — even distribution
  - `autoSegmented(roundId, segmentField, judgesPerSubmission)` — group by category/segment
  - `manual(roundId, assignments[])` — direct pairs
- `server/src/routes/judgeAssignment.ts` — `POST /rounds/:id/assign-judges`, `GET /rounds/:id/assignments`

### Files to Modify
- `components/dashboard/JudgingView.tsx` — add round selector, strategy picker (3 tabs: Random/Segmented/Manual)
- `services/database.ts` — update `assignJudgesToSubmissions` to accept roundId

---

## Phase 4: Public Voting System

**Why**: 0% built. Need public-facing voting page + admin config + real-time results.

### DB Changes
- Add `round_id` to existing `public_votes` table
- Add `voter_email`, `voter_name` columns to `public_votes`
- Create `voting_configs` table (round_id, votes_per_user, votes_per_submission, require_auth, allow_anonymous, show_results_publicly, show_leaderboard)

### Files to Create
- `server/src/services/votingEngine.ts` — `castVote()` (validates limits, round active, dedup), `getResults()`, `checkVoterEligibility()`
- `server/src/routes/publicVoting.ts` — `GET /voting/:roundId` (public), `POST /voting/:roundId/vote`, `GET /voting/:roundId/results` (admin), `GET /voting/:roundId/leaderboard`
- `components/pages/PublicVotingPage.tsx` — route `/vote/:roundId`, card grid, vote button, auth prompt if required, leaderboard
- `components/dashboard/VotingConfigPanel.tsx` — embedded in RoundConfigurationPanel for voting rounds
- `components/dashboard/VotingResultsView.tsx` — admin real-time results, bar charts, voter log

### Files to Modify
- `App.tsx` — add `/vote/:roundId` route
- `server/src/routes/index.ts` — mount voting routes
- `components/dashboard/scheduleRounds/RoundConfigurationPanel.tsx` — show VotingConfigPanel when round type is Public Voting

---

## Phase 5: Advancement Pipeline (Most Complex)

**Why**: Core requirement — evaluate criteria, preview, advance/eliminate, carry data forward.

### DB Changes
- Create `advancement_events` table (round_id, target_round_id, trigger_type, criteria_used, total_participants, advanced_count, eliminated_count, had_ties, tie_resolution, executed_by, executed_at, status)
- Create `advancement_details` table (advancement_event_id, submission_id, outcome: advanced/eliminated/override_*, rank, score, vote_count, was_at_cutoff_boundary, override_reason)

### Files to Create
- `server/src/services/advancementEngine.ts` — core logic:
  - `previewAdvancement(roundId)` — read-only, computes scores/votes, applies criteria, detects ties, returns preview
  - `executeAdvancement(roundId, overrides?, triggeredBy?)` — guards: refuses on empty scores (pauses), refuses on ties at boundary (pauses for admin). Creates `round_submissions` in target round, marks source submissions as advanced/eliminated, records `advancement_events` + `advancement_details`
  - Edge case handlers per requirements
- `server/src/routes/advancement.ts` — `POST /rounds/:id/advancement/preview`, `POST /rounds/:id/advancement/execute`, `GET /programs/:id/advancement-history`
- `components/dashboard/AdvancementPanel.tsx` — preview list (green=advancing, red=eliminated, yellow=tie), override toggles, criteria display, execute button with confirmation
- `components/dashboard/AdvancementHistoryView.tsx` — all events table, expandable per-submission details

### Files to Modify
- `server/src/jobs/roundScheduler.ts` — integrate auto-advancement for automatic trigger rounds
- `server/src/routes/index.ts` — mount advancement routes
- Schedule round tile UI — "Advance Participants" button on completed rounds, advancement arrows with counts

---

## Phase 6: Admin Monitoring & Overrides

### Files to Create
- `components/dashboard/PipelineMonitorView.tsx` — visual pipeline (React Flow) showing all rounds with live status, enrolled/scored/voted counts, progress bars

### Files to Modify
- `components/dashboard/DashboardLayout.tsx` — add Pipeline Monitor nav item
- Advancement + voting routes — add override endpoints (admin force-advance/eliminate, adjust votes) with audit logging

---

## Key Existing Code to Reuse

- `services/supabase.ts` — `vote()` method (line ~1169), adapt for round-scoped voting
- `types/scheduleRounds.ts` — `Round`, `RoundEdge`, `EdgeCondition`, `ShortlistConfig` types
- `server/src/cache/redisCache.ts` — `wrapWithCache`, `deleteCache`, `deleteCacheByPrefix`
- `api/_utils/rateLimit.ts` — rate limiting pattern for public voting
- `round_transitions` table (already exists) — log all round status changes
- `public_votes` table (already exists) — extend with round_id
- `audit_logs` table — log all advancement/override actions

## Verification Plan

1. **Form → Round enrollment**: Submit via form, verify `round_submissions` row created in first round
2. **Round lifecycle**: Activate round, verify status transition logged in `round_transitions`
3. **Judge assignment**: Run each strategy, verify `submission_judges` rows with correct `round_id`
4. **Public voting**: Open voting page, cast votes, verify limits enforced, results accurate
5. **Advancement**: Complete a judging round, preview advancement, verify tie detection, execute with overrides, verify participants enrolled in next round
6. **Auto-trigger**: Set round with automatic trigger and past end_date, verify scheduler advances participants
7. **Edge cases**: Empty scores pause auto-trigger, ties prompt admin, sequential round enforcement
The plan covers 6 phases building the complete pipeline: Form → Nominations → Rounds → Judging/Voting → Advancement.

Key highlights:

Phase 1: Connect form submissions to rounds via new round_submissions table
Phase 2: Round lifecycle engine (status transitions, auto-activation, scheduler job)
Phase 3: Three judge assignment strategies (random, segmented, manual)
Phase 4: Full public voting system (new page, config, real-time results)
Phase 5: Advancement pipeline with preview, execute, tie detection, auto-trigger edge cases
Phase 6: Admin pipeline monitor and override capabilities
Existing tables (public_votes, round_transitions) and services are reused wherever possible.

Claude’s Plan wobbly-coalescing-finch.md
User approved the plan
Update Todos

Phase 1: DB migration + round_submissions table + active_form_id

Phase 1: Backend — form-to-round pipeline in database.ts + supabase.ts

Phase 1: API route for active form + query keys

Phase 2: Types + round execution engine service

Phase 2: Round execution API routes + scheduler job

Phase 2: Frontend — round status badges, advancement config UI

Phase 3: Judge assignment strategies (random, segmented, manual)

Phase 4: Public voting engine + routes + voting page

Phase 4: Voting config panel + results view

Phase 5: Advancement engine + routes

Phase 5: Advancement UI (preview panel, history view)

Phase 6: Pipeline monitor view + admin overrides
Let me start with Phase 1. First, I need to read the current DB schema and key files.

Read currentdb.sql
Read database.types.ts
Now let me read the files I need to modify for Phase 1.

Grep "submitFormResponse|addSubmission" (in /Users/nitish/awardco/services/database.ts)
2 lines of output
Read queryKeys.ts
Read index.ts
Read scheduleRounds.ts
Read database.ts (lines 1761-1880)
Read redisCache.ts
Good. Now let me read the supabase.ts to understand submission creation patterns and the middleware.

Grep "submissions\.create|async create.*submission|const submissions" (in /Users/nitish/awardco/services/supabase.ts)
1 line of output
Read auth.ts
Read supabase.ts (lines 881-960)
Grep "create:.*async|async create" (in /Users/nitish/awardco/services/supabase.ts)
81 lines of output
Grep "create: async.*submission|submissions.*create" (in /Users/nitish/awardco/services/supabase.ts)
51 lines of output
Now I have enough context. Let me start implementing Phase 1. I'll create the migration, update types, and modify the backend files.

Bash Check migrations directory
IN
ls /Users/nitish/awardco/supabase/migrations/ 2>/dev/null || echo "no migrations dir"

OUT
001_rls_policies.sql
002_realtime_notifications.sql
003_search_and_indexes.sql
004_payments_multigateway.sql
005_current_iteration_consolidated.sql
006_hotfix_org_members_rls.sql
Write 007_round_pipeline.sql
96 lines
-- Migration 007: Round Pipeline
-- Connects form submissions to rounds, enables advancement tracking

-- 1. Add active_form_id to programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS active_form_id uuid REFERENCES public.program_forms(id);

-- 2. Add advancement columns to rounds
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS advancement_criteria jsonb DEFAULT '{}';
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS advancement_trigger character varying DEFAULT 'manual';
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS is_finalized boolean DEFAULT false;

-- 3. Add round_id to submission_judges (per-round assignments)
ALTER TABLE public.submission_judges ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.rounds(id);
CREATE INDEX IF NOT EXISTS idx_submission_judges_round ON public.submission_judges(round_id);

-- 4. Add round_id to judging_criteria (round-scoped criteria)
ALTER TABLE public.judging_criteria ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.rounds(id);

-- 5. Extend public_votes for round-scoped voting
ALTER TABLE public.public_votes ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.rounds(id);
ALTER TABLE public.public_votes ADD COLUMN IF NOT EXISTS voter_email character varying;
ALTER TABLE public.public_votes ADD COLUMN IF NOT EXISTS voter_name character varying;
CREATE INDEX IF NOT EXISTS idx_public_votes_round ON public.public_votes(round_id);

-- 6. Create round_submissions junction table
CREATE TABLE IF NOT EXISTS public.round_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  status character varying DEFAULT 'active',
  enrolled_at timestamp with time zone DEFAULT now(),
  advanced_at timestamp with time zone,
  eliminated_at timestamp with time zone,
  elimination_reason text,
  source_round_id uuid REFERENCES public.rounds(id),
  carried_score numeric,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT round_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT round_submissions_unique UNIQUE (round_id, submission_id)
);
CREATE INDEX IF NOT EXISTS idx_round_submissions_round ON public.round_submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_round_submissions_submission ON public.round_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_round_submissions_status ON public.round_submissions(status);

-- 7. Create voting_configs table
CREATE TABLE IF NOT EXISTS public.voting_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  round_id uuid NOT NULL UNIQUE REFERENCES public.rounds(id) ON DELETE CASCADE,
  votes_per_user integer DEFAULT 1,
  votes_per_submission integer DEFAULT 1,
  require_auth boolean DEFAULT false,
  allow_anonymous boolean DEFAULT true,
  show_results_publicly boolean DEFAULT false,
  show_leaderboard boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT voting_configs_pkey PRIMARY KEY (id)
);

-- 8. Create advancement_events table
CREATE TABLE IF NOT EXISTS public.advancement_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  round_id uuid NOT NULL REFERENCES public.rounds(id),
  target_round_id uuid REFERENCES public.rounds(id),
  trigger_type character varying NOT NULL,
  criteria_used jsonb NOT NULL,
  total_participants integer NOT NULL,
  advanced_count integer NOT NULL,
  eliminated_count integer NOT NULL,
  had_ties boolean DEFAULT false,
  tie_resolution jsonb,
  executed_by uuid REFERENCES public.profiles(id),
  executed_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'completed',
  metadata jsonb DEFAULT '{}',
  CONSTRAINT advancement_events_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_advancement_events_round ON public.advancement_events(round_id);

-- 9. Create advancement_details table
CREATE TABLE IF NOT EXISTS public.advancement_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  advancement_event_id uuid NOT NULL REFERENCES public.advancement_events(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.submissions(id),
  outcome character varying NOT NULL,
  rank integer,
  score numeric,
  vote_count integer,
  was_at_cutoff_boundary boolean DEFAULT false,
  override_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT advancement_details_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_advancement_details_event ON public.advancement_details(advancement_event_id);
CREATE INDEX IF NOT EXISTS idx_advancement_details_submission ON public.advancement_details(submission_id);
Now update the schema reference and database types.

Edit currentdb.sql
Added 67 lines
Now update the database types file with the new tables.

Edit database.types.ts
Added 176 lines
Now add the active_form_id to programs and add convenience type aliases at the bottom.

Edit database.types.ts
Added 3 lines
Now add the submission_judges.round_id to the types.

Edit database.types.ts
Added 3 lines
Add new convenience type aliases at the bottom.

Edit database.types.ts
Added 5 lines
Now update the types/scheduleRounds.ts with advancement types.

Edit scheduleRounds.ts
Added 9 lines
Update Todos

Phase 1: DB migration + round_submissions table + active_form_id

Phase 1: Backend — form-to-round pipeline in database.ts + supabase.ts

Phase 1: API route for active form + query keys

Phase 2: Types + round execution engine service

Phase 2: Round execution API routes + scheduler job

Phase 2: Frontend — round status badges, advancement config UI

Phase 3: Judge assignment strategies (random, segmented, manual)

Phase 4: Public voting engine + routes + voting page

Phase 4: Voting config panel + results view

Phase 5: Advancement engine + routes

Phase 5: Advancement UI (preview panel, history view)

Phase 6: Pipeline monitor view + admin overrides
Now let me add the round_submissions CRUD helpers to supabase.ts and modify the submitFormResponse to auto-enroll.

Read supabase.ts (lines 2-31)
Grep "^export const (forms|judging|submissions|notifications|audit|contacts|social|settings|realtime) ="" (in /Users/nitish/awardco/services/supabase.ts)
1 line of output
Grep "^export const \w+ ="" (in /Users/nitish/awardco/services/supabase.ts)
1 line of output
Grep "^export const \w+ =" (in /Users/nitish/awardco/services/supabase.ts)
26 lines of output
Let me find the end of the file to add the round_submissions service.

Read supabase.ts (lines 2491-2540)
Bash Count lines in supabase.ts
IN
wc -l /Users/nitish/awardco/services/supabase.ts

OUT
    2604 /Users/nitish/awardco/services/supabase.ts
Read supabase.ts (lines 2591-2610)
Edit supabase.ts
Added 201 lines
Now modify database.ts — add the auto-enrollment in submitFormResponse and add helper methods.

Read database.ts (lines 2-31)
Edit database.ts
Added 3 lines
Now modify submitFormResponse to auto-enroll the submission in the first round.

Edit database.ts
Added 9 lines
Now find the end of the class to add the new methods. Let me check where the class ends.

Bash Count lines in database.ts
IN
wc -l /Users/nitish/awardco/services/database.ts

OUT
    2116 /Users/nitish/awardco/services/database.ts
Read database.ts (lines 2091-2120)
Edit database.ts
Added 99 lines
Now update the query keys and add the active form API route.

Edit queryKeys.ts
Added 16 lines
Now add the active form endpoint to scheduleRounds route and add cache keys for new entities.

Edit redisCache.ts
Added 5 lines
Now add the active form route and round submissions routes to scheduleRounds.

Edit scheduleRounds.ts
Added 82 lines
Update Todos

Phase 1: DB migration + round_submissions table + active_form_id

Phase 1: Backend — form-to-round pipeline in database.ts + supabase.ts

Phase 1: API route for active form + query keys

Phase 2: Types + round execution engine service

Phase 2: Round execution API routes + scheduler job

Phase 2: Frontend — round status badges, advancement config UI

Phase 3: Judge assignment strategies (random, segmented, manual)

Phase 4: Public voting engine + routes + voting page

Phase 4: Voting config panel + results view

Phase 5: Advancement engine + routes

Phase 5: Advancement UI (preview panel, history view)

Phase 6: Pipeline monitor view + admin overrides
Phase 1 complete. Now Phase 2 — the round execution engine. Let me check the server src structure first.

Bash List server src directory
IN
ls /Users/nitish/awardco/server/src/

OUT
cache
index.ts
middleware
routes
supabase.ts
Read scheduleRounds.ts (lines 2-6)
Read supabase.ts
Now let me create the round engine service.

Bash Create services and jobs directories
IN
mkdir -p /Users/nitish/awardco/server/src/services /Users/nitish/awardco/server/src/jobs

OUT
(Bash completed with no output)
Write roundEngine.ts
280 lines
/**
 * Round Execution Engine
 *
 * Manages round lifecycle transitions:
 *   draft → scheduled → active → completed → finalized
 *
 * Guards:
 *   - Cannot activate without finalized predecessor (unless root round)
 *   - Cannot activate with 0 enrolled submissions
 *   - Cannot finalize without completing first
 *   - All transitions logged to round_transitions table
 */

import { getSupabaseAdmin } from '../supabase.js';

type RoundStatus = 'draft' | 'scheduled' | 'upcoming' | 'active' | 'completed' | 'cancelled';

interface RoundRow {
  id: string;
  program_id: string;
  title: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  settings: any;
  advancement_criteria: any;
  advancement_trigger: string;
  is_finalized: boolean;
}

async function logTransition(roundId: string, from: string, to: string, triggeredBy: string, metadata?: any) {
  const supabase = getSupabaseAdmin();
  await supabase.from('round_transitions').insert({
    round_id: roundId,
    from_status: from,
    to_status: to,
    triggered_by: triggeredBy,
    metadata: metadata || {},
  });
}

async function getRound(roundId: string): Promise<RoundRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('rounds').select('*').eq('id', roundId).single();
  return data;
}

async function updateRoundStatus(roundId: string, status: string, extra?: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('rounds').update({ status, ...extra }).eq('id', roundId);
  if (error) throw new Error(error.message);
}

async function getEnrolledCount(roundId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from('round_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', roundId)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  return count || 0;
}

/**
 * Get predecessor rounds (rounds that have edges pointing to this round).
 */
async function getPredecessorRounds(roundId: string, programId: string): Promise<RoundRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: edges } = await supabase
    .from('round_edges')
    .select('source_round_id')
    .eq('target_round_id', roundId)
    .eq('program_id', programId);

  if (!edges || edges.length === 0) return []; // Root round

  const sourceIds = edges.map(e => e.source_round_id);
  const { data: rounds } = await supabase.from('rounds').select('*').in('id', sourceIds);
  return rounds || [];
}

/**
 * Get successor rounds (rounds that this round has edges pointing to).
 */
async function getSuccessorRounds(roundId: string, programId: string): Promise<RoundRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: edges } = await supabase
    .from('round_edges')
    .select('target_round_id')
    .eq('source_round_id', roundId)
    .eq('program_id', programId);

  if (!edges || edges.length === 0) return [];

  const targetIds = edges.map(e => e.target_round_id);
  const { data: rounds } = await supabase.from('rounds').select('*').in('id', targetIds);
  return rounds || [];
}

// ---- Public API ----

export async function activateRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  const validFrom: RoundStatus[] = ['draft', 'scheduled', 'upcoming'];
  if (!validFrom.includes(round.status as RoundStatus)) {
    return { ok: false, error: `Cannot activate round with status '${round.status}'. Must be draft, scheduled, or upcoming.` };
  }

  // Guard: predecessors must be finalized (unless root)
  const predecessors = await getPredecessorRounds(roundId, round.program_id);
  if (predecessors.length > 0) {
    const unfinalized = predecessors.filter(p => !p.is_finalized);
    if (unfinalized.length > 0) {
      return {
        ok: false,
        error: `Cannot activate: predecessor round(s) not finalized: ${unfinalized.map(p => p.title).join(', ')}`,
      };
    }
  }

  // Guard: must have enrolled submissions
  const enrolledCount = await getEnrolledCount(roundId);
  if (enrolledCount === 0) {
    return { ok: false, error: 'Cannot activate round with 0 enrolled submissions.' };
  }

  await updateRoundStatus(roundId, 'active');
  await logTransition(roundId, round.status, 'active', triggeredBy);
  return { ok: true };
}

export async function completeRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.status !== 'active') {
    return { ok: false, error: `Cannot complete round with status '${round.status}'. Must be active.` };
  }

  await updateRoundStatus(roundId, 'completed');
  await logTransition(roundId, 'active', 'completed', triggeredBy);
  return { ok: true };
}

export async function finalizeRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.status !== 'completed') {
    return { ok: false, error: `Cannot finalize round with status '${round.status}'. Must be completed.` };
  }

  if (round.is_finalized) {
    return { ok: false, error: 'Round is already finalized.' };
  }

  await updateRoundStatus(roundId, 'completed', { is_finalized: true });
  await logTransition(roundId, 'completed', 'finalized', triggeredBy, { is_finalized: true });
  return { ok: true };
}

export async function cancelRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.is_finalized) {
    return { ok: false, error: 'Cannot cancel a finalized round.' };
  }

  const prevStatus = round.status;
  await updateRoundStatus(roundId, 'cancelled');
  await logTransition(roundId, prevStatus, 'cancelled', triggeredBy);
  return { ok: true };
}

/**
 * Get detailed status for a round including submission counts and scoring progress.
 */
export async function getRoundStatus(roundId: string) {
  const supabase = getSupabaseAdmin();
  const round = await getRound(roundId);
  if (!round) return null;

  // Get enrollment counts
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select('status')
    .eq('round_id', roundId);
  const rows = enrollments || [];

  // Get scoring progress for judging rounds
  let scoringProgress = null;
  if (round.type === 'jury' || round.type === 'Judging' || round.type === 'Shortlisting') {
    const { data: assignments } = await supabase
      .from('submission_judges')
      .select('status')
      .eq('round_id', roundId);
    const assignmentRows = assignments || [];
    scoringProgress = {
      total: assignmentRows.length,
      completed: assignmentRows.filter(a => a.status === 'completed').length,
      pending: assignmentRows.filter(a => a.status === 'pending').length,
    };
  }

  // Get voting progress for voting rounds
  let votingProgress = null;
  if (round.type === 'Public Voting' || round.type === 'Public Rating' || round.type === 'public') {
    const { count } = await supabase
      .from('public_votes')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId);
    votingProgress = { totalVotes: count || 0 };
  }

  return {
    ...round,
    enrollment: {
      total: rows.length,
      active: rows.filter(r => r.status === 'active').length,
      advanced: rows.filter(r => r.status === 'advanced').length,
      eliminated: rows.filter(r => r.status === 'eliminated').length,
    },
    scoringProgress,
    votingProgress,
  };
}

/**
 * Get pipeline status for all rounds in a program.
 */
export async function getPipelineStatus(programId: string) {
  const supabase = getSupabaseAdmin();

  const { data: allRounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });

  if (!allRounds || allRounds.length === 0) return { rounds: [], edges: [] };

  const { data: edges } = await supabase
    .from('round_edges')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });

  // Get enrollment counts per round
  const roundIds = allRounds.map(r => r.id);
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select('round_id, status')
    .in('round_id', roundIds);

  const enrollmentMap: Record<string, { total: number; active: number; advanced: number; eliminated: number }> = {};
  for (const row of (enrollments || [])) {
    if (!enrollmentMap[row.round_id]) {
      enrollmentMap[row.round_id] = { total: 0, active: 0, advanced: 0, eliminated: 0 };
    }
    enrollmentMap[row.round_id].total++;
    if (row.status === 'active') enrollmentMap[row.round_id].active++;
    if (row.status === 'advanced') enrollmentMap[row.round_id].advanced++;
    if (row.status === 'eliminated') enrollmentMap[row.round_id].eliminated++;
  }

  const roundsWithStatus = allRounds.map(r => ({
    ...r,
    enrollment: enrollmentMap[r.id] || { total: 0, active: 0, advanced: 0, eliminated: 0 },
  }));

  return { rounds: roundsWithStatus, edges: edges || [] };
}

export { getPredecessorRounds, getSuccessorRounds, getRound };
Now create the round execution routes.

Write roundExecution.ts
108 lines
import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  activateRound,
  completeRound,
  finalizeRound,
  cancelRound,
  getRoundStatus,
  getPipelineStatus,
} from '../services/roundEngine.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

async function invalidateRound(programId: string) {
  await Promise.all([
    deleteCache(cacheKeys.programRounds(programId)),
    deleteCache(cacheKeys.pipelineStatus(programId)),
    deleteCache(cacheKeys.programStats(programId)),
  ]);
}

router.post('/rounds/:roundId/activate', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const result = await activateRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    // Invalidate cache — need program ID from round
    const status = await getRoundStatus(roundId);
    if (status) await invalidateRound(status.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/complete', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const result = await completeRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    const status = await getRoundStatus(roundId);
    if (status) await invalidateRound(status.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/finalize', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const result = await finalizeRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    const status = await getRoundStatus(roundId);
    if (status) await invalidateRound(status.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const result = await cancelRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    const status = await getRoundStatus(roundId);
    if (status) await invalidateRound(status.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/rounds/:roundId/status', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    const status = await getRoundStatus(roundId);
    if (!status) return res.status(404).json({ error: 'Round not found' });
    return res.json({ data: status });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/programs/:programId/pipeline-status', requireAuth, async (req, res) => {
  const { programId } = req.params;
  try {
    const data = await wrapWithCache(cacheKeys.pipelineStatus(programId), cacheTtls.short, async () => {
      return getPipelineStatus(programId);
    });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
Now create the round scheduler job.

Write roundScheduler.ts
92 lines
/**
 * Round Scheduler Job
 *
 * Runs on an interval to:
 * 1. Auto-activate rounds whose start_date has passed (if prerequisites met)
 * 2. Auto-complete rounds whose end_date has passed
 * 3. Trigger auto-advancement for completed rounds with automatic trigger
 *
 * Non-blocking: failures are logged but don't crash the server.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { activateRound, completeRound } from '../services/roundEngine.js';
import { deleteCache } from '../cache/redisCache.js';

const SCHEDULER_INTERVAL_MS = 60_000; // 1 minute
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function tick() {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // 1. Auto-activate rounds past start_date
    const { data: toActivate } = await supabase
      .from('rounds')
      .select('id, program_id, title')
      .in('status', ['scheduled', 'upcoming'])
      .lte('start_date', now);

    for (const round of (toActivate || [])) {
      const result = await activateRound(round.id, 'scheduler_auto');
      if (result.ok) {
        console.log(`[scheduler] Auto-activated round: ${round.title} (${round.id})`);
        await deleteCache(`program:${round.program_id}:rounds`);
        await deleteCache(`program:${round.program_id}:pipeline-status`);
      }
      // If activation fails (e.g., prerequisites not met), silently skip — will retry next tick
    }

    // 2. Auto-complete rounds past end_date
    const { data: toComplete } = await supabase
      .from('rounds')
      .select('id, program_id, title')
      .eq('status', 'active')
      .lte('end_date', now);

    for (const round of (toComplete || [])) {
      const result = await completeRound(round.id, 'scheduler_auto');
      if (result.ok) {
        console.log(`[scheduler] Auto-completed round: ${round.title} (${round.id})`);
        await deleteCache(`program:${round.program_id}:rounds`);
        await deleteCache(`program:${round.program_id}:pipeline-status`);
      }
    }

    // 3. Auto-advancement for completed rounds with automatic trigger
    // This is handled by the advancement engine (Phase 5).
    // The scheduler identifies rounds that need advancement and delegates.
    const { data: toAdvance } = await supabase
      .from('rounds')
      .select('id, program_id, title, advancement_criteria, advancement_trigger')
      .eq('status', 'completed')
      .eq('is_finalized', false)
      .eq('advancement_trigger', 'automatic');

    for (const round of (toAdvance || [])) {
      // Auto-advancement will be wired in Phase 5.
      // For now, log it as a pending action.
      console.log(`[scheduler] Round ready for auto-advancement: ${round.title} (${round.id})`);
    }
  } catch (error) {
    console.error('[scheduler] Error in round scheduler tick:', error);
  }
}

export function startRoundScheduler() {
  if (schedulerTimer) return; // Already running
  console.log('[scheduler] Starting round scheduler (interval: 60s)');
  // Run immediately on startup, then on interval
  void tick();
  schedulerTimer = setInterval(tick, SCHEDULER_INTERVAL_MS);
}

export function stopRoundScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[scheduler] Round scheduler stopped');
  }
}
Now mount the new routes in index.ts and wire up the scheduler in the server entry point.

Edit index.ts
Added 2 lines
Now wire the scheduler into the server startup.

Read index.ts
Edit index.ts
Added 1 line
Edit index.ts
Added 2 lines
Update Todos

Phase 1: DB migration + round_submissions table + active_form_id

Phase 1: Backend — form-to-round pipeline in database.ts + supabase.ts

Phase 1: API route for active form + query keys

Phase 2: Types + round execution engine service

Phase 2: Round execution API routes + scheduler job

Phase 2: Frontend — round status badges, advancement config UI

Phase 3: Judge assignment strategies (random, segmented, manual)

Phase 4: Public voting engine + routes + voting page

Phase 4: Voting config panel + results view

Phase 5: Advancement engine + routes

Phase 5: Advancement UI (preview panel, history view)

Phase 6: Pipeline monitor view + admin overrides
Phase 2 backend done. Let me skip the frontend for now (Phase 2 frontend) and build Phase 3 (Judge Assignment) and Phase 4 (Public Voting) backends first, then do all the frontend together.

Now Phase 3 — Judge Assignment Strategies.

Write judgeAssignment.ts
242 lines
/**
 * Judge Assignment Engine
 *
 * Three strategies for assigning judges to submissions within a round:
 * 1. Auto Random — even distribution among available judges
 * 2. Auto Segmented — distribute by category/segment
 * 3. Manual — admin specifies exact pairs
 */

import { getSupabaseAdmin } from '../supabase.js';

interface AssignmentResult {
  ok: boolean;
  assigned: number;
  error?: string;
}

/**
 * Get active submissions in a round.
 */
async function getRoundActiveSubmissions(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('round_submissions')
    .select('submission_id, submissions(id, category_id, submission_data)')
    .eq('round_id', roundId)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Get available judges for a program.
 */
async function getAvailableJudges(programId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('judges')
    .select('id, name, email, bio, status')
    .eq('program_id', programId)
    .in('status', ['active', 'invited']);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create judge assignments in bulk.
 */
async function createAssignments(
  assignments: Array<{ submission_id: string; judge_id: string; round_id: string }>,
  assignedBy?: string
) {
  if (assignments.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  const rows = assignments.map(a => ({
    submission_id: a.submission_id,
    judge_id: a.judge_id,
    round_id: a.round_id,
    assigned_by: assignedBy || null,
    status: 'pending',
  }));
  const { data, error } = await supabase.from('submission_judges').insert(rows).select();
  if (error) throw new Error(error.message);
  return data?.length || 0;
}

/**
 * Get existing assignments for a round (to avoid duplicates).
 */
async function getExistingAssignments(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('submission_judges')
    .select('submission_id, judge_id')
    .eq('round_id', roundId);
  if (error) throw new Error(error.message);
  return new Set((data || []).map(a => `${a.submission_id}:${a.judge_id}`));
}

// ---- Strategy: Auto Random ----

export async function autoRandomAssign(
  roundId: string,
  programId: string,
  judgesPerSubmission: number = 3,
  assignedBy?: string
): Promise<AssignmentResult> {
  const enrollments = await getRoundActiveSubmissions(roundId);
  if (enrollments.length === 0) return { ok: false, assigned: 0, error: 'No active submissions in this round.' };

  const judges = await getAvailableJudges(programId);
  if (judges.length === 0) return { ok: false, assigned: 0, error: 'No available judges for this program.' };

  const existing = await getExistingAssignments(roundId);
  const assignments: Array<{ submission_id: string; judge_id: string; round_id: string }> = [];

  // Round-robin distribution for even load
  let judgeIndex = 0;
  for (const enrollment of enrollments) {
    const submissionId = enrollment.submission_id;
    let assignedCount = 0;
    let attempts = 0;
    const maxAttempts = judges.length;

    while (assignedCount < judgesPerSubmission && attempts < maxAttempts) {
      const judge = judges[judgeIndex % judges.length];
      const key = `${submissionId}:${judge.id}`;
      if (!existing.has(key)) {
        assignments.push({ submission_id: submissionId, judge_id: judge.id, round_id: roundId });
        existing.add(key);
        assignedCount++;
      }
      judgeIndex++;
      attempts++;
    }
  }

  const count = await createAssignments(assignments, assignedBy);
  return { ok: true, assigned: count };
}

// ---- Strategy: Auto Segmented ----

export async function autoSegmentedAssign(
  roundId: string,
  programId: string,
  segmentField: string = 'category_id', // or a key in submission_data
  judgesPerSubmission: number = 3,
  assignedBy?: string
): Promise<AssignmentResult> {
  const enrollments = await getRoundActiveSubmissions(roundId);
  if (enrollments.length === 0) return { ok: false, assigned: 0, error: 'No active submissions in this round.' };

  const judges = await getAvailableJudges(programId);
  if (judges.length === 0) return { ok: false, assigned: 0, error: 'No available judges for this program.' };

  const existing = await getExistingAssignments(roundId);

  // Group submissions by segment
  const segments: Record<string, string[]> = {};
  for (const enrollment of enrollments) {
    const sub = (enrollment as any).submissions;
    let segmentValue: string;

    if (segmentField === 'category_id') {
      segmentValue = sub?.category_id || 'uncategorized';
    } else {
      // Look in submission_data for custom segment field
      segmentValue = sub?.submission_data?.[segmentField] || 'default';
    }

    if (!segments[segmentValue]) segments[segmentValue] = [];
    segments[segmentValue].push(enrollment.submission_id);
  }

  // Distribute judges across segments — each segment gets a pool of judges
  const segmentKeys = Object.keys(segments);
  const judgePool = [...judges];
  const assignments: Array<{ submission_id: string; judge_id: string; round_id: string }> = [];

  for (let segIdx = 0; segIdx < segmentKeys.length; segIdx++) {
    const segmentSubmissions = segments[segmentKeys[segIdx]];
    // Assign judges starting from different offsets per segment
    const offset = segIdx * Math.floor(judgePool.length / Math.max(segmentKeys.length, 1));

    for (const submissionId of segmentSubmissions) {
      let assignedCount = 0;
      let attempts = 0;
      const maxAttempts = judgePool.length;
      let jIdx = offset;

      while (assignedCount < judgesPerSubmission && attempts < maxAttempts) {
        const judge = judgePool[jIdx % judgePool.length];
        const key = `${submissionId}:${judge.id}`;
        if (!existing.has(key)) {
          assignments.push({ submission_id: submissionId, judge_id: judge.id, round_id: roundId });
          existing.add(key);
          assignedCount++;
        }
        jIdx++;
        attempts++;
      }
    }
  }

  const count = await createAssignments(assignments, assignedBy);
  return { ok: true, assigned: count };
}

// ---- Strategy: Manual ----

export async function manualAssign(
  roundId: string,
  assignments: Array<{ submission_id: string; judge_id: string }>,
  assignedBy?: string
): Promise<AssignmentResult> {
  if (assignments.length === 0) return { ok: false, assigned: 0, error: 'No assignments provided.' };

  const existing = await getExistingAssignments(roundId);
  const newAssignments = assignments
    .filter(a => !existing.has(`${a.submission_id}:${a.judge_id}`))
    .map(a => ({ ...a, round_id: roundId }));

  if (newAssignments.length === 0) return { ok: true, assigned: 0, error: 'All provided assignments already exist.' };

  const count = await createAssignments(newAssignments, assignedBy);
  return { ok: true, assigned: count };
}

// ---- Query: Get assignments by round ----

export async function getAssignmentsByRound(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('submission_judges')
    .select(`
      *,
      judges(id, name, email, avatar_url, status),
      submissions(id, title, applicant_name, category_id, status)
    `)
    .eq('round_id', roundId)
    .order('assigned_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// ---- Remove assignment ----

export async function removeAssignment(assignmentId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('submission_judges').delete().eq('id', assignmentId);
  if (error) throw new Error(error.message);
}

// ---- Remove all assignments for a round ----

export async function clearRoundAssignments(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('submission_judges').delete().eq('round_id', roundId).eq('status', 'pending');
  if (error) throw new Error(error.message);
}
Write judgeAssignment.ts
99 lines
import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  autoRandomAssign,
  autoSegmentedAssign,
  manualAssign,
  getAssignmentsByRound,
  removeAssignment,
  clearRoundAssignments,
} from '../services/judgeAssignment.js';
import { deleteCache, cacheKeys } from '../cache/redisCache.js';

const router = Router();

router.post('/rounds/:roundId/assign-judges', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  const { strategy, program_id, config } = req.body || {};

  if (!strategy || !program_id) {
    return res.status(400).json({ error: 'strategy and program_id are required' });
  }

  try {
    let result;
    switch (strategy) {
      case 'random':
        result = await autoRandomAssign(
          roundId,
          program_id,
          config?.judges_per_submission || 3,
          req.userId
        );
        break;
      case 'segmented':
        result = await autoSegmentedAssign(
          roundId,
          program_id,
          config?.segment_field || 'category_id',
          config?.judges_per_submission || 3,
          req.userId
        );
        break;
      case 'manual':
        result = await manualAssign(
          roundId,
          config?.assignments || [],
          req.userId
        );
        break;
      default:
        return res.status(400).json({ error: `Unknown strategy: ${strategy}` });
    }

    await deleteCache(cacheKeys.roundSubmissions(roundId));

    if (!result.ok) {
      return res.status(400).json({ error: result.error, assigned: result.assigned });
    }

    return res.json({ ok: true, assigned: result.assigned });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/rounds/:roundId/assignments', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    const data = await getAssignmentsByRound(roundId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/rounds/:roundId/assignments/:assignmentId', requireAuth, async (req, res) => {
  const { roundId, assignmentId } = req.params;
  try {
    await removeAssignment(assignmentId);
    await deleteCache(cacheKeys.roundSubmissions(roundId));
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/rounds/:roundId/assignments', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    await clearRoundAssignments(roundId);
    await deleteCache(cacheKeys.roundSubmissions(roundId));
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
Mount it in the router.

Edit index.ts
Added 2 lines
Update Todos

Phase 1: DB migration + round_submissions table + active_form_id

Phase 1: Backend — form-to-round pipeline in database.ts + supabase.ts

Phase 1: API route for active form + query keys

Phase 2: Types + round execution engine service

Phase 2: Round execution API routes + scheduler job

Phase 3: Judge assignment strategies (random, segmented, manual)

Phase 4: Public voting engine + routes + voting page

Phase 4: Voting config panel + results view

Phase 5: Advancement engine + routes

Phase 5: Advancement UI (preview panel, history view)

Phase 6: Pipeline monitor view + admin overrides
Now Phase 4 — Public Voting Engine + Routes.

Write votingEngine.ts
285 lines
/**
 * Voting Engine
 *
 * Handles public voting for Public Voting rounds:
 * - Vote casting with limit enforcement
 * - Voter eligibility checks
 * - Real-time results aggregation
 */

import { getSupabaseAdmin } from '../supabase.js';

interface VoterInfo {
  userId?: string;
  email?: string;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface VoteResult {
  ok: boolean;
  error?: string;
}

interface VotingResults {
  submissions: Array<{
    submission_id: string;
    title: string;
    applicant_name: string | null;
    vote_count: number;
    rank: number;
  }>;
  totalVotes: number;
}

/**
 * Get the voting configuration for a round.
 */
async function getVotingConfig(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('voting_configs')
    .select('*')
    .eq('round_id', roundId)
    .single();
  return data;
}

/**
 * Get the round and verify it's a public voting round that's active.
 */
async function getActiveVotingRound(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('rounds')
    .select('*, programs(id, title, slug, cover_image_url)')
    .eq('id', roundId)
    .single();

  if (!data) return null;

  const isVotingType = ['Public Voting', 'Public Rating', 'public'].includes(data.type);
  if (!isVotingType) return null;

  return data;
}

/**
 * Check how many votes a voter has cast in this round.
 */
async function getVoterVoteCount(roundId: string, voterInfo: VoterInfo) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('public_votes')
    .select('id, submission_id', { count: 'exact' })
    .eq('round_id', roundId);

  if (voterInfo.userId) {
    query = query.eq('user_id', voterInfo.userId);
  } else if (voterInfo.ipAddress) {
    query = query.eq('ip_address', voterInfo.ipAddress);
  }

  const { data, count } = await query;
  return {
    total: count || 0,
    submissionIds: (data || []).map(v => v.submission_id),
  };
}

// ---- Public API ----

/**
 * Get voting round info + submissions for public display.
 */
export async function getVotingRoundPublic(roundId: string) {
  const round = await getActiveVotingRound(roundId);
  if (!round) return null;

  const config = await getVotingConfig(roundId);
  const supabase = getSupabaseAdmin();

  // Get submissions enrolled in this round
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select(`
      submission_id,
      submissions(id, title, description, cover_image_url, applicant_name, votes_count, category_id, categories(title))
    `)
    .eq('round_id', roundId)
    .eq('status', 'active');

  const submissions = (enrollments || []).map((e: any) => ({
    id: e.submissions?.id,
    title: e.submissions?.title,
    description: e.submissions?.description,
    cover_image_url: e.submissions?.cover_image_url,
    applicant_name: e.submissions?.applicant_name,
    votes_count: config?.show_results_publicly ? (e.submissions?.votes_count || 0) : undefined,
    category: e.submissions?.categories?.title,
  }));

  return {
    round: {
      id: round.id,
      title: round.title,
      description: round.description,
      type: round.type,
      status: round.status,
      start_date: round.start_date,
      end_date: round.end_date,
    },
    program: round.programs,
    config: config ? {
      votes_per_user: config.votes_per_user,
      votes_per_submission: config.votes_per_submission,
      require_auth: config.require_auth,
      show_results_publicly: config.show_results_publicly,
      show_leaderboard: config.show_leaderboard,
    } : null,
    submissions,
  };
}

/**
 * Cast a vote. Validates limits and round status.
 */
export async function castVote(
  roundId: string,
  submissionId: string,
  voterInfo: VoterInfo
): Promise<VoteResult> {
  const round = await getActiveVotingRound(roundId);
  if (!round) return { ok: false, error: 'Voting round not found or not active.' };
  if (round.status !== 'active') return { ok: false, error: 'This voting round is not currently active.' };

  const config = await getVotingConfig(roundId);

  // Check auth requirement
  if (config?.require_auth && !voterInfo.userId) {
    return { ok: false, error: 'Authentication is required to vote.' };
  }

  // Check if anonymous voting is allowed
  if (!config?.allow_anonymous && !voterInfo.userId) {
    return { ok: false, error: 'Anonymous voting is not allowed for this round.' };
  }

  // Check vote limits
  if (config) {
    const voterVotes = await getVoterVoteCount(roundId, voterInfo);

    // Check total votes per user
    if (config.votes_per_user > 0 && voterVotes.total >= config.votes_per_user) {
      return { ok: false, error: `You have reached the maximum of ${config.votes_per_user} vote(s) for this round.` };
    }

    // Check votes per submission
    if (config.votes_per_submission > 0) {
      const votesForThisSubmission = voterVotes.submissionIds.filter(id => id === submissionId).length;
      if (votesForThisSubmission >= config.votes_per_submission) {
        return { ok: false, error: `You have already voted for this submission.` };
      }
    }
  }

  // Verify submission is enrolled in this round
  const supabase = getSupabaseAdmin();
  const { data: enrollment } = await supabase
    .from('round_submissions')
    .select('id')
    .eq('round_id', roundId)
    .eq('submission_id', submissionId)
    .eq('status', 'active')
    .single();

  if (!enrollment) return { ok: false, error: 'Submission is not part of this voting round.' };

  // Cast the vote
  const { error: insertError } = await supabase
    .from('public_votes')
    .insert({
      round_id: roundId,
      submission_id: submissionId,
      user_id: voterInfo.userId || null,
      ip_address: voterInfo.ipAddress || null,
      user_agent: voterInfo.userAgent || null,
      voter_email: voterInfo.email || null,
      voter_name: voterInfo.name || null,
    });

  if (insertError) return { ok: false, error: insertError.message };

  // Increment votes_count on the submission
  const { data: sub } = await supabase
    .from('submissions')
    .select('votes_count')
    .eq('id', submissionId)
    .single();

  if (sub) {
    await supabase
      .from('submissions')
      .update({ votes_count: (sub.votes_count || 0) + 1 })
      .eq('id', submissionId);
  }

  return { ok: true };
}

/**
 * Get voting results for a round (admin view).
 */
export async function getVotingResults(roundId: string): Promise<VotingResults> {
  const supabase = getSupabaseAdmin();

  // Count votes per submission
  const { data: votes } = await supabase
    .from('public_votes')
    .select('submission_id')
    .eq('round_id', roundId);

  const voteCounts: Record<string, number> = {};
  let totalVotes = 0;
  for (const vote of (votes || [])) {
    voteCounts[vote.submission_id] = (voteCounts[vote.submission_id] || 0) + 1;
    totalVotes++;
  }

  // Get submission details
  const submissionIds = Object.keys(voteCounts);
  if (submissionIds.length === 0) return { submissions: [], totalVotes: 0 };

  const { data: subs } = await supabase
    .from('submissions')
    .select('id, title, applicant_name')
    .in('id', submissionIds);

  const results = (subs || [])
    .map(s => ({
      submission_id: s.id,
      title: s.title,
      applicant_name: s.applicant_name,
      vote_count: voteCounts[s.id] || 0,
      rank: 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count);

  // Assign ranks
  results.forEach((r, i) => { r.rank = i + 1; });

  return { submissions: results, totalVotes };
}

/**
 * Get leaderboard (public-safe, respects config).
 */
export async function getLeaderboard(roundId: string) {
  const config = await getVotingConfig(roundId);
  if (!config?.show_leaderboard) return null;

  const results = await getVotingResults(roundId);
  return results;
}
Write publicVoting.ts
190 lines
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getVotingRoundPublic,
  castVote,
  getVotingResults,
  getLeaderboard,
} from '../services/votingEngine.js';
import { getSupabaseAdmin } from '../supabase.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

// ---- Public Endpoints (no auth required) ----

/**
 * GET /voting/:roundId — Get voting round info + submissions for public display.
 */
router.get('/:roundId', async (req, res) => {
  const { roundId } = req.params;
  try {
    const data = await getVotingRoundPublic(roundId);
    if (!data) return res.status(404).json({ error: 'Voting round not found or not active.' });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

/**
 * POST /voting/:roundId/vote — Cast a vote.
 */
router.post('/:roundId/vote', async (req, res) => {
  const { roundId } = req.params;
  const { submission_id, email, name } = req.body || {};

  if (!submission_id) {
    return res.status(400).json({ error: 'submission_id is required' });
  }

  // Extract voter info
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || null;

  // Try to get authenticated user (optional)
  let userId: string | undefined;
  const authHeader = req.header('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (token) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) userId = data.user.id;
    } catch {
      // Not authenticated — proceed as anonymous
    }
  }

  try {
    const result = await castVote(roundId, submission_id, {
      userId,
      email: email || undefined,
      name: name || undefined,
      ipAddress: ipAddress || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    if (!result.ok) return res.status(400).json({ error: result.error });

    // Invalidate cached results
    await deleteCache(cacheKeys.votingResults(roundId));

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

/**
 * GET /voting/:roundId/leaderboard — Public leaderboard (if enabled).
 */
router.get('/:roundId/leaderboard', async (req, res) => {
  const { roundId } = req.params;
  try {
    const data = await getLeaderboard(roundId);
    if (!data) return res.status(403).json({ error: 'Leaderboard is not enabled for this round.' });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

// ---- Admin Endpoints (auth required) ----

/**
 * GET /voting/:roundId/results — Full voting results (admin only).
 */
router.get('/:roundId/results', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    const data = await wrapWithCache(cacheKeys.votingResults(roundId), cacheTtls.short, async () => {
      return getVotingResults(roundId);
    });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

/**
 * GET /voting/:roundId/config — Get voting config (admin only).
 */
router.get('/:roundId/config', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('voting_configs')
      .select('*')
      .eq('round_id', roundId)
      .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return res.status(500).json({ error: error.message });
    }
    return res.json({ data: data || null });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

/**
 * PUT /voting/:roundId/config — Update voting config (admin only).
 */
router.put('/:roundId/config', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  const config = req.body || {};
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('voting_configs')
      .upsert({
        round_id: roundId,
        votes_per_user: config.votes_per_user,
        votes_per_submission: config.votes_per_submission,
        require_auth: config.require_auth,
        allow_anonymous: config.allow_anonymous,
        show_results_publicly: config.show_results_publicly,
        show_leaderboard: config.show_leaderboard,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'round_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await deleteCache(cacheKeys.votingConfig(roundId));
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

/**
 * GET /voting/:roundId/voters — Voter log (admin only).
 */
router.get('/:roundId/voters', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
  const offset = (page - 1) * pageSize;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error, count } = await supabase
      .from('public_votes')
      .select('*, submissions(id, title, applicant_name)', { count: 'exact' })
      .eq('round_id', roundId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data, total: count || 0, page, pageSize });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
Mount the voting routes.

Edit index.ts
Added 1 line
Edit index.ts
Added 1 line
Update Todos

Phase 1-3: Backend complete (DB, pipeline, round engine, judge assignment)

Phase 4: Public voting engine + routes

Phase 5: Advancement engine + routes

Phase 4-5: Frontend — voting page, voting config, advancement UI

Phase 2: Frontend — round status badges, advancement config UI

Phase 6: Pipeline monitor view + admin overrides
Now Phase 5 — the Advancement Engine, the most complex piece.

Write advancementEngine.ts
518 lines
/**
 * Advancement Engine
 *
 * Core logic for evaluating round results and advancing/eliminating participants.
 *
 * Criteria types:
 *   top_n       — top N participants by score/votes advance
 *   top_percent — top N% of participants advance
 *   score_threshold — participants at or above a threshold advance
 *   manual      — admin handpicks (no auto-calculation)
 *   all_pass    — everyone advances
 *
 * Edge cases:
 *   - Empty scores/votes → pauses, returns { paused: true, reason: 'no_scores' }
 *   - Ties at cutoff → pauses, returns { paused: true, reason: 'tie_at_boundary', ties: [...] }
 *   - Admin can provide overrides to force-advance or force-eliminate
 */

import { getSupabaseAdmin } from '../supabase.js';
import { getSuccessorRounds, getRound } from './roundEngine.js';

interface AdvancementCriteria {
  type: 'top_n' | 'top_percent' | 'score_threshold' | 'manual' | 'all_pass';
  value?: number;
}

interface ParticipantScore {
  submissionId: string;
  score: number;
  voteCount: number;
  rank: number;
}

interface PreviewResult {
  paused?: boolean;
  reason?: string;
  advancing: ParticipantScore[];
  eliminated: ParticipantScore[];
  ties: ParticipantScore[];
  hasEmptyScores: boolean;
  totalParticipants: number;
}

interface AdvancementOverride {
  submissionId: string;
  action: 'force_advance' | 'force_eliminate';
  reason?: string;
}

interface ExecuteResult {
  ok: boolean;
  paused?: boolean;
  reason?: string;
  ties?: ParticipantScore[];
  eventId?: string;
  advancedCount?: number;
  eliminatedCount?: number;
  error?: string;
}

/**
 * Compute scores for all active participants in a round.
 * For judging rounds: average of all judges' weighted scores.
 * For voting rounds: vote count.
 */
async function computeParticipantScores(roundId: string, roundType: string): Promise<ParticipantScore[]> {
  const supabase = getSupabaseAdmin();

  // Get all active enrollments
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select('submission_id')
    .eq('round_id', roundId)
    .eq('status', 'active');

  if (!enrollments || enrollments.length === 0) return [];

  const submissionIds = enrollments.map(e => e.submission_id);

  const isVotingRound = ['Public Voting', 'Public Rating', 'public'].includes(roundType);

  if (isVotingRound) {
    // Score by vote count
    const { data: votes } = await supabase
      .from('public_votes')
      .select('submission_id')
      .eq('round_id', roundId);

    const voteCounts: Record<string, number> = {};
    for (const vote of (votes || [])) {
      voteCounts[vote.submission_id] = (voteCounts[vote.submission_id] || 0) + 1;
    }

    const results: ParticipantScore[] = submissionIds.map(id => ({
      submissionId: id,
      score: voteCounts[id] || 0,
      voteCount: voteCounts[id] || 0,
      rank: 0,
    }));

    // Sort descending by vote count
    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => { r.rank = i + 1; });
    return results;
  }

  // Judging round — compute average score per submission
  const { data: assignments } = await supabase
    .from('submission_judges')
    .select(`
      submission_id,
      status,
      scores(score, criterion_id, judging_criteria(weight, max_score))
    `)
    .eq('round_id', roundId)
    .in('submission_id', submissionIds);

  // Calculate weighted average per submission
  const scoreMap: Record<string, { totalWeighted: number; totalWeight: number; judgeCount: number }> = {};

  for (const assignment of (assignments || [])) {
    if (assignment.status !== 'completed') continue;
    const subId = assignment.submission_id;
    if (!scoreMap[subId]) scoreMap[subId] = { totalWeighted: 0, totalWeight: 0, judgeCount: 0 };

    const scores = (assignment as any).scores || [];
    for (const s of scores) {
      const weight = s.judging_criteria?.weight || 100;
      const maxScore = s.judging_criteria?.max_score || 10;
      const normalized = (s.score / maxScore) * weight;
      scoreMap[subId].totalWeighted += normalized;
      scoreMap[subId].totalWeight += weight;
    }
    scoreMap[subId].judgeCount++;
  }

  const results: ParticipantScore[] = submissionIds.map(id => {
    const entry = scoreMap[id];
    const avgScore = entry && entry.totalWeight > 0
      ? (entry.totalWeighted / entry.totalWeight) * 100 / (entry.judgeCount || 1)
      : 0;
    return {
      submissionId: id,
      score: Math.round(avgScore * 100) / 100,
      voteCount: 0,
      rank: 0,
    };
  });

  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

/**
 * Apply advancement criteria to ranked participants.
 */
function applyCriteria(
  ranked: ParticipantScore[],
  criteria: AdvancementCriteria
): { advancing: ParticipantScore[]; eliminated: ParticipantScore[]; ties: ParticipantScore[] } {
  if (ranked.length === 0) return { advancing: [], eliminated: [], ties: [] };

  let cutoffIndex: number;

  switch (criteria.type) {
    case 'all_pass':
      return { advancing: [...ranked], eliminated: [], ties: [] };

    case 'manual':
      // Manual means no auto-calculation — admin picks
      return { advancing: [], eliminated: [], ties: [] };

    case 'top_n': {
      const n = criteria.value || 1;
      cutoffIndex = Math.min(n, ranked.length);
      break;
    }
    case 'top_percent': {
      const pct = criteria.value || 50;
      cutoffIndex = Math.ceil(ranked.length * pct / 100);
      break;
    }
    case 'score_threshold': {
      const threshold = criteria.value || 0;
      cutoffIndex = ranked.filter(r => r.score >= threshold).length;
      break;
    }
    default:
      return { advancing: [...ranked], eliminated: [], ties: [] };
  }

  // Detect ties at the cutoff boundary
  if (cutoffIndex > 0 && cutoffIndex < ranked.length) {
    const cutoffScore = ranked[cutoffIndex - 1].score;
    const ties = ranked.filter(
      (r, i) => r.score === cutoffScore && (i >= cutoffIndex - 1)
    );

    // If ties span the boundary, flag them
    const tiesBeforeCutoff = ranked.slice(0, cutoffIndex).filter(r => r.score === cutoffScore);
    const tiesAfterCutoff = ranked.slice(cutoffIndex).filter(r => r.score === cutoffScore);

    if (tiesAfterCutoff.length > 0 && tiesBeforeCutoff.length > 0) {
      // There's a tie at the boundary
      const clearAdvancing = ranked.slice(0, cutoffIndex).filter(r => r.score > cutoffScore);
      const clearEliminated = ranked.slice(cutoffIndex).filter(r => r.score < cutoffScore);
      const allTied = ranked.filter(r => r.score === cutoffScore);

      return {
        advancing: clearAdvancing,
        eliminated: clearEliminated,
        ties: allTied,
      };
    }
  }

  return {
    advancing: ranked.slice(0, cutoffIndex),
    eliminated: ranked.slice(cutoffIndex),
    ties: [],
  };
}

// ---- Public API ----

/**
 * Preview advancement without mutating data.
 */
export async function previewAdvancement(
  roundId: string,
  criteriaOverride?: AdvancementCriteria
): Promise<PreviewResult> {
  const round = await getRound(roundId);
  if (!round) throw new Error('Round not found');

  const criteria: AdvancementCriteria = criteriaOverride || round.advancement_criteria as AdvancementCriteria || { type: 'all_pass' };
  const ranked = await computeParticipantScores(roundId, round.type);

  // Check for empty scores
  const isJudgingRound = !['Public Voting', 'Public Rating', 'public'].includes(round.type);
  const hasEmptyScores = isJudgingRound && ranked.every(r => r.score === 0);

  if (hasEmptyScores && ranked.length > 0) {
    return {
      paused: true,
      reason: 'no_scores',
      advancing: [],
      eliminated: [],
      ties: ranked,
      hasEmptyScores: true,
      totalParticipants: ranked.length,
    };
  }

  const { advancing, eliminated, ties } = applyCriteria(ranked, criteria);

  if (ties.length > 0) {
    return {
      paused: true,
      reason: 'tie_at_boundary',
      advancing,
      eliminated,
      ties,
      hasEmptyScores: false,
      totalParticipants: ranked.length,
    };
  }

  return {
    advancing,
    eliminated,
    ties: [],
    hasEmptyScores: false,
    totalParticipants: ranked.length,
  };
}

/**
 * Execute advancement — mutates data, enrolls in next round.
 */
export async function executeAdvancement(
  roundId: string,
  overrides?: AdvancementOverride[],
  triggeredBy?: string,
  criteriaOverride?: AdvancementCriteria,
  tieResolutions?: Array<{ submissionId: string; action: 'advance' | 'eliminate' }>
): Promise<ExecuteResult> {
  const supabase = getSupabaseAdmin();
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.status !== 'completed') {
    return { ok: false, error: 'Round must be completed before advancing participants.' };
  }
  if (round.is_finalized) {
    return { ok: false, error: 'Round is already finalized.' };
  }

  // Get preview
  const preview = await previewAdvancement(roundId, criteriaOverride);

  // Handle empty scores
  if (preview.hasEmptyScores && !overrides?.length) {
    return { ok: false, paused: true, reason: 'no_scores', error: 'No scores submitted. Cannot auto-advance with empty data.' };
  }

  // Handle ties (if no resolutions provided)
  if (preview.ties.length > 0 && !tieResolutions?.length && !overrides?.length) {
    return {
      ok: false,
      paused: true,
      reason: 'tie_at_boundary',
      ties: preview.ties,
      error: `${preview.ties.length} participant(s) tied at cutoff boundary. Resolve ties before advancing.`,
    };
  }

  // Build final advancing/eliminated lists
  const advancingSet = new Set(preview.advancing.map(p => p.submissionId));
  const eliminatedSet = new Set(preview.eliminated.map(p => p.submissionId));

  // Apply tie resolutions
  for (const tr of (tieResolutions || [])) {
    if (tr.action === 'advance') advancingSet.add(tr.submissionId);
    else eliminatedSet.add(tr.submissionId);
  }

  // Apply overrides
  for (const override of (overrides || [])) {
    if (override.action === 'force_advance') {
      advancingSet.add(override.submissionId);
      eliminatedSet.delete(override.submissionId);
    } else {
      eliminatedSet.add(override.submissionId);
      advancingSet.delete(override.submissionId);
    }
  }

  // Ensure ties that weren't resolved are eliminated by default
  for (const tie of preview.ties) {
    if (!advancingSet.has(tie.submissionId) && !eliminatedSet.has(tie.submissionId)) {
      eliminatedSet.add(tie.submissionId);
    }
  }

  // Find target round
  const successors = await getSuccessorRounds(roundId, round.program_id);
  const targetRound = successors.length > 0 ? successors[0] : null;

  // Create advancement event
  const criteria = criteriaOverride || round.advancement_criteria || { type: 'all_pass' };
  const { data: event, error: eventError } = await supabase
    .from('advancement_events')
    .insert({
      round_id: roundId,
      target_round_id: targetRound?.id || null,
      trigger_type: triggeredBy === 'scheduler_auto' ? 'automatic' : 'manual',
      criteria_used: criteria,
      total_participants: preview.totalParticipants,
      advanced_count: advancingSet.size,
      eliminated_count: eliminatedSet.size,
      had_ties: preview.ties.length > 0,
      tie_resolution: tieResolutions || null,
      executed_by: triggeredBy && triggeredBy !== 'scheduler_auto' ? triggeredBy : null,
    })
    .select()
    .single();

  if (eventError || !event) {
    return { ok: false, error: eventError?.message || 'Failed to create advancement event' };
  }

  // Build score lookup for details
  const allScored = [...preview.advancing, ...preview.eliminated, ...preview.ties];
  const scoreMap = new Map(allScored.map(p => [p.submissionId, p]));

  // Create advancement details
  const details: Array<any> = [];

  for (const subId of advancingSet) {
    const p = scoreMap.get(subId);
    const override = overrides?.find(o => o.submissionId === subId);
    details.push({
      advancement_event_id: event.id,
      submission_id: subId,
      outcome: override ? 'override_advanced' : 'advanced',
      rank: p?.rank || null,
      score: p?.score || null,
      vote_count: p?.voteCount || null,
      was_at_cutoff_boundary: preview.ties.some(t => t.submissionId === subId),
      override_reason: override?.reason || null,
    });
  }

  for (const subId of eliminatedSet) {
    const p = scoreMap.get(subId);
    const override = overrides?.find(o => o.submissionId === subId);
    details.push({
      advancement_event_id: event.id,
      submission_id: subId,
      outcome: override ? 'override_eliminated' : 'eliminated',
      rank: p?.rank || null,
      score: p?.score || null,
      vote_count: p?.voteCount || null,
      was_at_cutoff_boundary: preview.ties.some(t => t.submissionId === subId),
      override_reason: override?.reason || null,
    });
  }

  if (details.length > 0) {
    await supabase.from('advancement_details').insert(details);
  }

  // Update round_submissions statuses
  for (const subId of advancingSet) {
    await supabase
      .from('round_submissions')
      .update({ status: 'advanced', advanced_at: new Date().toISOString() })
      .eq('round_id', roundId)
      .eq('submission_id', subId);
  }

  for (const subId of eliminatedSet) {
    const override = overrides?.find(o => o.submissionId === subId);
    await supabase
      .from('round_submissions')
      .update({
        status: 'eliminated',
        eliminated_at: new Date().toISOString(),
        elimination_reason: override?.reason || `Eliminated in round: ${round.title}`,
      })
      .eq('round_id', roundId)
      .eq('submission_id', subId);
  }

  // Enroll advancing participants in the target round
  if (targetRound && advancingSet.size > 0) {
    const enrollments = Array.from(advancingSet).map(subId => {
      const p = scoreMap.get(subId);
      return {
        round_id: targetRound.id,
        submission_id: subId,
        status: 'active',
        source_round_id: roundId,
        carried_score: p?.score ?? null,
      };
    });

    await supabase
      .from('round_submissions')
      .upsert(enrollments, { onConflict: 'round_id,submission_id' });
  }

  // Finalize the source round
  await supabase
    .from('rounds')
    .update({ is_finalized: true })
    .eq('id', roundId);

  // Log transition
  await supabase.from('round_transitions').insert({
    round_id: roundId,
    from_status: 'completed',
    to_status: 'finalized',
    triggered_by: triggeredBy || 'admin',
    metadata: { advancement_event_id: event.id },
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    action: 'Advanced participants',
    action_type: 'advancement',
    resource_type: 'round',
    resource_id: roundId,
    details: `Advanced ${advancingSet.size}, eliminated ${eliminatedSet.size} from "${round.title}"`,
    metadata: {
      event_id: event.id,
      target_round_id: targetRound?.id,
      advanced_count: advancingSet.size,
      eliminated_count: eliminatedSet.size,
    },
  });

  return {
    ok: true,
    eventId: event.id,
    advancedCount: advancingSet.size,
    eliminatedCount: eliminatedSet.size,
  };
}

/**
 * Get advancement history for a program.
 */
export async function getAdvancementHistory(programId: string) {
  const supabase = getSupabaseAdmin();
  const { data: allRounds } = await supabase
    .from('rounds')
    .select('id')
    .eq('program_id', programId);

  if (!allRounds || allRounds.length === 0) return [];

  const roundIds = allRounds.map(r => r.id);
  const { data } = await supabase
    .from('advancement_events')
    .select(`
      *,
      advancement_details(*),
      rounds!advancement_events_round_id_fkey(title, type)
    `)
    .in('round_id', roundIds)
    .order('executed_at', { ascending: false });

  return data || [];
}
You've hit your limit · resets 7:30pm (Asia/Calcutta)