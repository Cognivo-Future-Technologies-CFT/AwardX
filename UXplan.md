# UX Improvement Plan
_Last analysed: 2026-04-02_
_Stack: React 19 + TypeScript, Tailwind CSS 4, Supabase (PostgreSQL + Auth), Vite, Vercel Serverless, React Query, Framer Motion_

---

## Executive Summary

AwardX is a multi-tenant SaaS platform for managing awards programs, competitions, grants, and exhibitions. It serves three distinct user groups: **program administrators** who create and manage award programs, **applicants** who submit entries via public forms, and **judges** who score and review submissions through a token-based portal. The platform covers the full lifecycle — from program creation and form building through submission management, judging assignments, scoring, and winner announcements — with supporting features for payments (Stripe/Razorpay), email notifications, team collaboration, analytics, and public marketing pages.

The most critical UX problems are: (1) the **Modal component lacks fundamental accessibility** — no focus trap, no `aria-modal`, no Escape key handler — and since modals are used across every dashboard view, this is a platform-wide accessibility failure; (2) **destructive actions use `window.confirm`** instead of designed confirmation dialogs, breaking visual consistency and offering no undo path; (3) **empty states are absent or generic** across most dashboard views — a new user with no programs, no submissions, and no judges sees zeroed-out stat cards and empty tables with no guidance; (4) **form validation is inconsistent** — some forms validate on submit only, some not at all, and error messages range from helpful to raw Supabase error strings; (5) the **judge portal is incomplete** — token verification works but the actual judging interface (scoring, commenting, submitting reviews) is not fully rendered.

The vision is an experience where every user — whether a first-time program admin setting up their inaugural awards ceremony, an applicant filling out a multi-page submission form on their phone, or a judge reviewing entries on a tablet — can complete their task with zero hesitation, zero re-reading, and zero frustration. Achieving this means AwardX doesn't just compete with tools like Awardforce — it surpasses them with the clarity of Linear, the confidence of Stripe, and the efficiency of Notion.

---

## User Personas

### Persona 1: Sarah — Program Administrator
- **Role**: Operations director at a design industry association
- **Primary goal**: Set up and run an annual design awards program end-to-end
- **Key tasks**: Create program, build submission forms, invite judges, review submissions, announce winners
- **Current frustrations**: Empty dashboard on first use gives no guidance; form builder lacks validation feedback; deleting categories doesn't warn about cascading impact; settings save without visible success confirmation
- **What success looks like**: She can set up a complete awards program in under 30 minutes, confidently knowing each step is correct because the system confirms her progress at every turn

### Persona 2: James — Applicant
- **Primary goal**: Submit a competition entry with supporting materials
- **Key tasks**: Find the program, fill out the submission form, upload files, pay the entry fee, track submission status
- **Current frustrations**: Draft auto-save gives no visual indication; payment flow can fail silently; form validation only fires on submit (not inline); no way to contact the organizer with questions
- **What success looks like**: He completes the form in one sitting with inline guidance, sees his draft saved in real-time, pays confidently, and can check his submission status anytime

### Persona 3: Dr. Priya — Judge
- **Primary goal**: Review assigned submissions and submit fair, thorough scores
- **Key tasks**: Access judging portal via email link, review submission details, score against criteria, leave comments, submit review
- **Current frustrations**: One-time invite token means if the link is opened accidentally, it's consumed; the judge portal page verifies the token but the actual scoring interface is incomplete; no way to save partial progress
- **What success looks like**: She opens the link, sees a clear list of assigned submissions, reviews each with all materials visible, scores against well-defined criteria, saves progress, and submits when ready

### Persona 4: Mike — Team Member
- **Primary goal**: Collaborate on program management with specific role-based access
- **Key tasks**: Accept team invite, manage submissions within his permission scope, track activity
- **Current frustrations**: Invite email is plain text with minimal context; role permissions aren't explained in the UI; no indication of what actions he can't perform
- **What success looks like**: He understands his role immediately, sees only what's relevant, and never encounters a permission wall without explanation

---

## Current State Audit

### What's Working Well
- **Visual design foundation** is strong — the glass-morphism aesthetic, Inter + Outfit font pairing, and brand color system (`tailwind.config.js`) create a modern, cohesive look
- **Authentication flow** handles OAuth + email/password cleanly with proper session management (`contexts/AuthContext.tsx`)
- **Form submission page** (`components/pages/FormSubmissionPage.tsx`) supports multi-page forms with draft persistence and payment integration
- **Skeleton loaders** (`components/SkeletonLoader.tsx`) are used in key dashboard views — better than generic spinners
- **React Query** is used consistently for server state with sensible defaults (15s stale time, 1 retry)
- **Dashboard sidebar** (`components/dashboard/DashboardLayout.tsx`) has a logical navigation structure with icons and collapsible state
- **My Submissions page** (`components/pages/MySubmissionsPage.tsx`) shows feedback from judges, expandable sections, and withdrawal capability
- **Workspace state persistence** saves active program and view across sessions via `user_workspace_state` table
- **Code splitting** via React.lazy for all page components improves initial load performance

### Critical Issues

| # | Issue | Where | Impact |
|---|-------|--------|--------|
| 1 | Modal has no focus trap, no `aria-modal`, no Escape key handler, no `aria-labelledby` | `components/Modal.tsx` | Every modal in the app is inaccessible to keyboard and screen reader users; fails WCAG 2.1 SC 2.1.2 (No Keyboard Trap), 4.1.2 |
| 2 | Judge portal scoring interface is incomplete — token verification works but actual judging UI not rendered | `components/pages/JudgePortalPage.tsx` | Judges cannot complete their primary task; entire judging workflow is blocked |
| 3 | No inline form validation across the application; errors only appear on submit (or not at all) | `LoginPage`, `SignupPage`, `FormSubmissionPage`, `JudgingView`, `TeamsView` | Users fill entire forms before learning of errors; increases abandonment on multi-page submission forms |
| 4 | Destructive actions use `window.confirm()` instead of designed confirmation dialogs | `FormBuilderView`, `SubmissionTable`, `JudgingView`, `CategoriesView` | Breaks visual consistency; provides no undo; browser-native dialogs can be blocked by some environments |
| 5 | Notification endpoints (`/api/notifications/*`) require no authentication | `api/notifications/new-submission.ts`, `judge-assigned.ts`, `deadline-approaching.ts` | Anyone can send fake notifications to any organization by guessing UUIDs |

### High Priority Issues

| # | Issue | Where | Impact |
|---|-------|--------|--------|
| 1 | Empty states missing across dashboard views — new users see zeroed stats and blank tables with no guidance | `DashboardOverview`, `SubmissionTable`, `JudgingView`, `CategoriesView`, `FormBuilderView` | First-time users don't know what to do next; product feels broken |
| 2 | Error messages expose raw Supabase/auth error strings to users | `LoginPage.tsx:59`, `SignupPage`, `SettingsView` | Technical error messages erode trust and confuse non-technical users |
| 3 | No loading indicator on bulk actions (delete, assign judges, status change) | `SubmissionTable.tsx`, `JudgingView.tsx` | Users click, nothing visible happens, they click again — causes double-actions |
| 4 | UserHoverCard has hardcoded placeholder data ("San Francisco, CA", "Joined Oct 2024") | `components/UserHoverCard.tsx` | Displays false information for every user; erodes trust |
| 5 | Success messages auto-dismiss after 3 seconds — too fast for many users | `FormBuilderView.tsx`, `SettingsView.tsx` | Users miss confirmation that their action succeeded |
| 6 | SubmissionProcessView formatting toolbar (B/I/U/H1/H2) buttons have no handlers | `components/dashboard/SubmissionProcessView.tsx` | Buttons appear functional but do nothing; frustrating |
| 7 | "Last 7 Days" dropdown on DashboardOverview is non-functional | `components/dashboard/DashboardOverview.tsx` | Interactive element that does nothing; breaks trust |
| 8 | ReachView (social media) is mostly placeholder UI — connect buttons and triggers don't function | `components/dashboard/ReachView.tsx` | Feature appears complete but isn't; misleads users |

### Medium Priority Issues

| # | Issue | Where | Impact |
|---|-------|--------|--------|
| 1 | Login/Signup pages show disabled Apple and LinkedIn OAuth buttons with only "Coming soon" tooltip | `LoginPage.tsx:218-231`, `SignupPage` | Clutters the interface; disabled buttons without explanation reduce confidence |
| 2 | Judge invite tokens are one-time use with no re-invite mechanism visible in UI | `api/invites/verify-judge.ts`, `JudgingView.tsx` | If a judge accidentally opens the link, they're locked out |
| 3 | Sidebar navigation has no `role="navigation"`, no `aria-current` for active view | `DashboardLayout.tsx` | Screen reader users cannot identify navigation landmarks or current location |
| 4 | Custom toggle switches throughout dashboard are `<div>`-based, not semantic `<input type="checkbox">` | `SubmissionProcessView`, `ReachView`, `JudgingView` | Invisible to screen readers; not keyboard-operable |
| 5 | CSV export in DashboardOverview uses hardcoded headers that don't match actual form fields | `DashboardOverview.tsx` | Exported data is misleading; admin may make decisions on wrong data |
| 6 | No skip-to-content link on any page | All pages | Keyboard users must tab through entire navigation on every page load |
| 7 | Status badges rely on color alone (green=accepted, red=rejected) with no icon or pattern | `SubmissionTable`, `SubmissionDetailModal`, `MySubmissionsPage` | Fails WCAG 1.4.1 — users with color vision deficiency cannot distinguish statuses |
| 8 | Rate limiting is in-memory only — doesn't persist across serverless function instances | `api/_utils/rateLimit.ts` | Rate limits are per-instance, effectively useless on Vercel's distributed infrastructure |
| 9 | Password field on signup has no strength indicator or confirmation field | `SignupPage.tsx` | Users may set weak passwords; no way to catch typos |
| 10 | Forgot password link on login page is `href="#"` — not implemented | `LoginPage.tsx:302` | Users who forget passwords have no self-service recovery |

### Low Priority / Polish

| # | Issue | Where | Impact |
|---|-------|--------|--------|
| 1 | "Remember me" checkbox on login has no functional implementation | `LoginPage.tsx:295-299` | Misleading UI element |
| 2 | Copyright footer says "Protected by reCAPTCHA" but no reCAPTCHA is implemented | `LoginPage.tsx:321` | False claim; potential legal/trust issue |
| 3 | Avatar fallback uses first character of name — breaks for emoji or special character names | `Header.tsx` | Minor visual glitch for edge-case names |
| 4 | Audit log filters (Type/User/Date Range) buttons render but are non-functional | `AuditLogsView.tsx` | Placeholders that look interactive |
| 5 | Search input on audit logs has placeholder text but no `<label>` element | `AuditLogsView.tsx` | Minor accessibility gap |
| 6 | Dashboard initialization has a hardcoded 10-second timeout with no user-facing error message | `Dashboard.tsx` | If init takes >10s, user sees nothing — just a stuck spinner |
| 7 | Mobile hamburger menu in Header missing `aria-expanded` attribute | `Header.tsx` | Screen readers don't know menu state |
| 8 | Submission detail modal limits response display to `max-h-[300px]` — arbitrary cutoff | `SubmissionDetailModal.tsx` | Long submissions require scrolling inside a modal that itself scrolls |

---

## User Flow Analysis

### Flow: New User Onboarding (Program Admin)
**Entry point**: `/signup` → `/auth/callback` → `/dashboard`
**Goal**: Create first award program and get submissions flowing

**Current steps**:
1. Sign up with email/password or Google
2. OAuth callback redirects to dashboard
3. Dashboard initializes (up to 10s spinner)
4. EventSelectionView appears (no events exist)
5. User must figure out they need to create a program
6. Click "Create Program" — fill minimal form
7. Navigate to each section (Forms, Categories, etc.) independently
8. No guidance on what to configure or in what order

**Problems**:
- No onboarding wizard or checklist
- Empty dashboard with zero stat cards offers no next step
- User must discover the sidebar navigation independently
- No indication of which configuration steps are required vs optional
- No "getting started" guide or contextual help

**Redesigned flow**:
1. Sign up → OAuth callback → Dashboard
2. First-time user sees onboarding overlay: "Let's set up your first program"
3. Guided wizard: Program details → Categories → Form setup → Judging config → Review & launch
4. Each step shows progress bar and can be saved/resumed
5. After setup, dashboard shows populated overview with "Next steps" card
6. Contextual tooltips on first visit to each section

**Key changes**: Add first-run detection, onboarding wizard component, and "getting started" checklist that persists until dismissed

### Flow: Applicant Form Submission
**Entry point**: `/form/:formId` (public link)
**Goal**: Complete and submit an entry

**Current steps**:
1. Open form link
2. Form loads with title and description
3. Fill multi-page form (pages indicated at top)
4. Navigate between pages with arrows
5. Draft auto-saves silently
6. Submit form (may require payment)
7. Payment via Stripe/Razorpay
8. Success state

**Problems**:
- No visual indication that drafts are being saved
- Page navigation arrows are generic (ChevronLeft/Right) with no page labels
- Validation only fires on submit, not inline or on page change
- If payment fails, the error path is unclear
- Required fields not visually distinguished beyond HTML `required`
- No progress indicator showing "Page 2 of 5"
- Theme colors from form builder not validated for contrast

**Redesigned flow**:
1. Open form → See program branding, clear title, "Page 1 of N" progress bar
2. Fill fields with inline validation (on blur for text, immediate for selects)
3. Required fields marked with asterisk + "(required)" for screen readers
4. Navigate pages — validation prevents advancing with errors on current page
5. "Draft saved" indicator appears briefly on each auto-save
6. Final page shows summary of all responses with "Edit" links per section
7. Submit → clear payment flow with loading states → Success with confirmation number

**Key changes**: Add progress bar, inline validation, draft-save indicator, summary review page, confirmation number

### Flow: Judge Review
**Entry point**: Email invite → `/judge/:token`
**Goal**: Review assigned submissions and submit scores

**Current steps**:
1. Receive email with one-time link
2. Click link → token verified → judge marked active
3. Portal loads with program info and assigned submissions
4. (Incomplete) — scoring interface not fully implemented

**Problems**:
- One-time token consumed on first visit — no re-access mechanism
- Judge portal page verifies token but doesn't render full scoring UI
- No way to save partial reviews
- No indication of how many submissions to review
- No estimated time commitment shown
- Email warns "one-time link" but doesn't explain what happens after first use

**Redesigned flow**:
1. Email invite with clear instructions: "You have N submissions to review"
2. Click link → token verified → persistent session created for judge
3. Portal shows: overview (N submissions, criteria, deadline), submission list
4. Click submission → see all materials, scoring rubric alongside
5. Score each criterion with slider/input, leave comments
6. Save progress — can return later via same session
7. "Submit all reviews" when complete → confirmation
8. Judge can view their submitted scores (read-only) after submission

**Key changes**: Create persistent judge sessions (not one-time tokens for the session), build full scoring UI, add progress tracking, enable partial saves

### Flow: Authentication (Login)
**Entry point**: `/login`
**Goal**: Access the dashboard

**Current steps**:
1. See login page with Google, Apple (disabled), LinkedIn (disabled) OAuth
2. Or enter email + password
3. Click "Log In"
4. On success → redirect to dashboard (or form return URL)
5. On error → red error banner with raw auth error message

**Problems**:
- Disabled OAuth buttons clutter the interface
- "Forgot password?" link is `href="#"` — not functional
- Error messages are raw Supabase strings (e.g., "Invalid login credentials")
- No "Remember me" implementation despite checkbox being visible
- Loading state only disables submit button, doesn't prevent double-submit on OAuth
- reCAPTCHA claimed in footer but not implemented

**Redesigned flow**:
1. Login page shows only functional auth methods (Google + email/password)
2. Inline validation: email format checked on blur, password minimum length
3. "Forgot password?" links to actual password reset flow
4. Human-friendly error: "That email and password combination doesn't match our records. Try again or reset your password."
5. Loading state covers entire form, not just one button
6. Remove reCAPTCHA claim or implement it

**Key changes**: Remove disabled OAuth buttons, implement password reset, humanize error messages, fix loading state

---

## Information Architecture

### Current IA
```
/ (Landing)
├── /features
├── /how-it-works
├── /stories
├── /pricing
├── /login
├── /signup
├── /auth/callback
├── /form/:formId (Public submission)
├── /program/:slug (Public program page)
├── /workflow/:programId (Public workflow)
├── /judge/:token (Judge portal)
├── /my-submissions (Applicant portal)
├── /demo (Demo dashboard)
└── /dashboard (Authenticated)
    ├── overview
    ├── custom-grid
    ├── builder
    ├── schedule
    ├── schedule-rounds
    ├── submission-setup
    ├── awards (categories)
    ├── templates (forms)
    ├── submissions
    ├── judging
    ├── reach
    ├── analytics
    ├── teams
    ├── settings
    ├── audit-logs
    └── program-details
```

### Problems
1. **"templates"** label for form management is confusing — users look for "Forms"
2. **"awards"** label for categories is ambiguous — could mean winners, prizes, or categories
3. **"reach"** is marketing jargon — unclear to most users what it contains
4. **"schedule"** and **"schedule-rounds"** are separate views with overlapping concepts
5. **"builder"** vs **"submission-setup"** vs **"templates"** — three form-related sections with unclear boundaries
6. Dashboard uses client-side view switching (not URL routing) — no deep links, no browser back button, no shareable URLs
7. `/my-submissions` is outside the dashboard but requires auth — inconsistent with the rest of the protected area

### Proposed IA
```
/ (Landing)
├── /features, /how-it-works, /stories, /pricing (Marketing)
├── /login, /signup, /auth/callback (Auth)
├── /submit/:formId (Public submission - clearer verb)
├── /program/:slug (Public program page)
├── /judge/:token (Judge portal)
└── /dashboard (Authenticated)
    ├── /dashboard/overview
    ├── /dashboard/programs (Program selection + CRUD)
    ├── /dashboard/program/:id/
    │   ├── submissions (View/manage entries)
    │   ├── forms (Build/edit submission forms)
    │   ├── categories (Award categories)
    │   ├── judging (Judges, criteria, assignments)
    │   ├── workflow (Rounds + schedule — merged)
    │   ├── marketing (Public page, social, campaigns)
    │   ├── analytics (Stats + reports)
    │   └── settings (Program config, payments, team)
    ├── /dashboard/my-submissions (Applicant portal — moved inside)
    ├── /dashboard/team (Org-level team management)
    ├── /dashboard/activity (Audit logs — clearer name)
    └── /dashboard/settings (Org-level settings)
```

**Rationale**: URL-based routing enables deep links, browser back/forward, and shareable URLs. Labels use plain language. Related features (schedule + schedule-rounds) merged. Form-related sections consolidated.

---

## Design System Gaps

### Colours
- **Brand tokens defined** in `tailwind.config.js`: `brand-primary` (#6366f1), `brand-secondary` (#8b5cf6), `brand-accent` (#06b6d4), `brand-dark` (#1e1b4b) — good foundation
- **Hardcoded hex values** throughout components: `indigo-600`, `indigo-500`, `slate-900`, `green-500`, `red-500`, `amber-500` used directly instead of semantic tokens
- **No semantic color system**: Missing `--color-success`, `--color-warning`, `--color-danger`, `--color-info` tokens
- **Status colors** (green for active, red for rejected, amber for pending) are used without accompanying icons or patterns — fails WCAG 1.4.1
- **Contrast concerns**: `text-slate-400` on white backgrounds (#94a3b8 on #ffffff) is 3.4:1 — fails WCAG AA for normal text (4.5:1 required)

### Typography
- **Font families well-defined**: Outfit (display), Inter (body) — consistently applied
- **Heading sizes vary**: `text-3xl`, `text-4xl`, `text-xl` used inconsistently for page titles across different views
- **Line heights**: Default Tailwind line-heights used but not explicitly controlled — some long-form text areas feel cramped
- **Font weights**: Mostly `font-bold` and `font-semibold` — limited weight scale usage

### Spacing
- **Magic numbers**: `p-6`, `p-8`, `gap-3`, `gap-4`, `gap-6` used without a clear spacing scale rationale
- **Category tree indentation**: `depth * 4` pixels — hardcoded magic number in `DashboardLayout.tsx`
- **Modal content**: Hardcoded `max-h-[300px]` for submission response display
- **Submission detail**: Arbitrary scroll containers with fixed heights

### Components
- **Button**: Well-structured with variants and sizes (`components/Button.tsx`), but missing: loading state, icon-only variant, and the `disabled` state is only opacity change
- **Modal**: Minimal implementation — no focus trap, no ARIA attributes, no size variants, no footer slot for actions
- **Form inputs**: No shared input component — each form rebuilds inputs with slightly different styling
- **Toggle switches**: Reimplemented as `<div>` elements in multiple places — should be a shared accessible component
- **Confirmation dialogs**: Don't exist as a component — `window.confirm` used everywhere
- **Toast/notification**: No shared toast system — success/error messages are inline `<div>` elements with inconsistent styling and timing
- **Tables**: Each view rebuilds table markup — no shared table component with sorting, pagination, selection

---

## Accessibility Findings

| Issue | WCAG Criterion | Severity | Location |
|-------|---------------|----------|----------|
| Modal has no focus trap | 2.1.2 No Keyboard Trap | Critical | `components/Modal.tsx` |
| Modal missing `aria-modal="true"` and `role="dialog"` | 4.1.2 Name, Role, Value | Critical | `components/Modal.tsx` |
| Modal missing `aria-labelledby` for title | 4.1.2 Name, Role, Value | Critical | `components/Modal.tsx` |
| No Escape key handler on modals | 2.1.1 Keyboard | Critical | `components/Modal.tsx` |
| Status badges use color alone | 1.4.1 Use of Color | High | `SubmissionTable`, `SubmissionDetailModal`, `MySubmissionsPage` |
| Custom toggle switches are `<div>`-based | 4.1.2 Name, Role, Value | High | `SubmissionProcessView`, `ReachView`, `JudgingView` |
| No skip-to-content link | 2.4.1 Bypass Blocks | High | All pages |
| `text-slate-400` on white fails 4.5:1 contrast | 1.4.3 Contrast (Minimum) | High | Multiple components — helper text, labels, timestamps |
| Sidebar missing `role="navigation"` | 1.3.1 Info and Relationships | Medium | `DashboardLayout.tsx` |
| Sidebar missing `aria-current="page"` on active item | 4.1.2 Name, Role, Value | Medium | `DashboardLayout.tsx` |
| Mobile hamburger menu missing `aria-expanded` | 4.1.2 Name, Role, Value | Medium | `Header.tsx` |
| Search inputs missing visible `<label>` elements | 1.3.1 Info and Relationships | Medium | `AuditLogsView`, `SubmissionTable` |
| Tab panels missing `aria-selected` on active tab | 4.1.2 Name, Role, Value | Medium | `JudgingView`, `TeamsView`, `SettingsView` |
| Drag-and-drop in FormBuilder not keyboard accessible | 2.1.1 Keyboard | Medium | `FormBuilder.tsx` |
| Charts/graphs have no text alternative | 1.1.1 Non-text Content | Medium | `DashboardOverview.tsx`, `AnalyticsView.tsx` |
| Close button on modal has no `aria-label` | 4.1.2 Name, Role, Value | Low | `components/Modal.tsx` |
| Icon-only buttons throughout lack `aria-label` | 4.1.2 Name, Role, Value | Low | Multiple components |
| No `prefers-reduced-motion` media query respect | 2.3.3 Animation from Interactions | Low | Framer Motion animations throughout |

---

## Microcopy Rewrites

| Location | Current | Improved | Why |
|----------|---------|----------|-----|
| `DashboardOverview` export | `"No submissions to export"` | `"Nothing to export yet. Submissions will appear here once applicants start submitting."` | Explains cause and sets expectation |
| `ErrorBoundary` button | `"Try Again"` | `"Reload this section"` | Specifies what will happen |
| `LoginPage` error | Raw Supabase: `"Invalid login credentials"` | `"That email and password combination doesn't match. Check your spelling or reset your password."` | Human, actionable, not accusatory |
| `DashboardOverview` stat | `"Action Needed"` (for pending) | `"Awaiting Review"` | More specific — tells user what status means |
| `DashboardOverview` indicator | `"Online"` for judges | `"Active"` or remove entirely | "Online" implies real-time presence which isn't tracked |
| `FormBuilderView` delete | `window.confirm("Delete?")` | Modal: `"Delete form '[name]'? This will remove all fields and settings. Submitted responses are not affected."` | Specific, reassures about data safety |
| `JudgingView` remove all | `window.confirm("Remove all judges?")` | Modal: `"Remove all N judges? Their existing scores will be preserved but they'll lose portal access."` | Shows count, clarifies consequences |
| `LoginPage` footer | `"Protected by reCAPTCHA"` | Remove or implement reCAPTCHA | False claim |
| `ProtectedRoute` loading | `"Checking authentication..."` | `"Loading..."` | Users don't need to know about auth internals |
| `AuthCallback` success | `"Authentication successful! Redirecting..."` | `"You're in! Taking you to your dashboard..."` | Warmer, less technical |
| `SubmissionTable` bulk delete | `window.confirm("Are you sure?")` | Modal: `"Delete N selected submissions? This action cannot be undone."` | Shows count, states irreversibility |

---

## Quick Wins

1. **Add Escape key handler to Modal** — `useEffect` with `keydown` listener for Escape. One line of code, fixes a critical accessibility issue. (`components/Modal.tsx`)

2. **Add `aria-modal="true"`, `role="dialog"`, and `aria-labelledby`** to Modal component — three attribute additions. (`components/Modal.tsx`)

3. **Add skip-to-content link** — a visually-hidden `<a>` at the top of the layout that becomes visible on focus, linking to `<main id="main-content">`. (`DashboardLayout.tsx`, `Header.tsx`)

4. **Replace `window.confirm` with confirmation modal** — create a `ConfirmDialog` component using the existing Modal, then replace all `window.confirm` calls. Consistent design, better UX. (All dashboard views)

5. **Add status icons alongside color badges** — a checkmark for accepted, X for rejected, clock for pending, minus for withdrawn. Fixes WCAG 1.4.1 with minimal effort. (`SubmissionTable.tsx`, `MySubmissionsPage.tsx`)

6. **Remove disabled OAuth buttons** from login/signup or gray them out with a clear "Coming Q3 2026" label. Currently they just confuse. (`LoginPage.tsx`, `SignupPage.tsx`)

7. **Add "Draft saved" indicator** to FormSubmissionPage — show a brief "Saved" text near the form title when auto-save fires. (`FormSubmissionPage.tsx`)

8. **Fix helper text contrast** — change `text-slate-400` to `text-slate-500` (#64748b, 4.6:1 ratio) for all helper/description text. (Global Tailwind change)

9. **Add empty state components** to SubmissionTable, JudgingView, and CategoriesView — illustration + headline + CTA button (e.g., "No submissions yet — share your form link to start collecting entries"). (Dashboard views)

10. **Humanize login error messages** — wrap the raw auth error in a switch statement mapping common codes to friendly messages. (`LoginPage.tsx`)

---

## Strategic Improvements

1. **URL-Based Dashboard Routing** — Replace the client-side `currentView` state with React Router nested routes under `/dashboard`. This enables deep linking, browser back/forward, shareable URLs, and proper page titles. Requires refactoring `Dashboard.tsx` and `DashboardLayout.tsx` but dramatically improves navigation UX. (Scope: L — 2-3 days)

2. **Shared Component Library** — Build a proper set of shared UI components: `Input`, `Select`, `Toggle`, `ConfirmDialog`, `Toast`, `DataTable`, `EmptyState`, `StatusBadge`. This eliminates reimplementation across views, ensures accessibility, and enforces design consistency. (Scope: XL — 1 week)

3. **Onboarding Wizard** — First-run experience that guides new program admins through: Program details → Categories → Form setup → Judging config → Launch. Persisted in `user_workspace_state`. Reduces time-to-value and eliminates the "blank dashboard" problem. (Scope: L — 2-3 days)

4. **Complete Judge Portal** — Build the full judging interface: submission viewer, scoring form per criterion, comment/notes section, progress tracker, save & resume, final submission. This is a core workflow that's currently non-functional. (Scope: XL — 1 week)

5. **Inline Form Validation System** — Create a validation hook (`useFormValidation`) that supports on-blur validation, shows errors per field, prevents page navigation with errors, and works with the dynamic form builder fields. Apply to login, signup, submission forms, and all dashboard forms. (Scope: L — 2-3 days)

6. **Toast Notification System** — Replace all inline success/error messages with a centralized toast system (context + portal). Configurable duration, dismiss button, action buttons, and queuing for multiple notifications. (Scope: M — 1 day)

7. **Implement Password Reset Flow** — Build the forgot-password page, connect to Supabase auth `resetPassword`, add the email template, and create the reset-password page for the callback. Currently the "Forgot password?" link goes nowhere. (Scope: M — 1 day)

8. **Distributed Rate Limiting** — Replace in-memory rate limiting with Redis/Upstash-based solution that works across Vercel's distributed serverless instances. Current implementation provides no real protection. (Scope: S — half day)

---

## The Vision: Ideal Experience

Imagine opening AwardX for the first time. You sign up with Google, and instead of a blank dashboard, a warm welcome screen greets you: "Let's create your first program." A guided wizard walks you through naming your awards, setting up categories, building your submission form with a drag-and-drop builder that validates as you go, configuring judging criteria, and previewing your public program page — all in under 15 minutes. When you're done, you get a shareable link and a checklist of optional next steps.

Your applicants click that link and see a beautifully branded submission form. Required fields are clearly marked, inline validation catches errors as they type, and a progress bar shows "Step 2 of 4." If they need to step away, a subtle "Draft saved" badge assures them nothing is lost. Payment flows seamlessly — Stripe for US entrants, Razorpay for India — and a confirmation email arrives within seconds.

Your judges receive a polished email invitation. They click through to a focused portal that shows exactly how many submissions they need to review, with an estimated time commitment. Each submission displays all materials alongside the scoring rubric. They rate each criterion with clear sliders, leave constructive feedback, save their progress, and submit when ready. A progress bar tracks their completion.

Back in your dashboard, everything is alive. Submission counts tick up in real-time, judge progress is visible at a glance, and smart notifications surface what needs your attention. Every action gives immediate feedback — saves confirm with a toast, deletions ask for confirmation in a thoughtful dialog that explains what will happen, and errors speak in plain English with clear next steps. The whole experience feels like it was designed by someone who has actually run an awards program — because every interaction removes a decision the user shouldn't have to make.

---

## How to Measure Success

| Metric | Current (estimated) | Target | How to Measure |
|--------|--------------------|---------| ---------------|
| Time to first published program | 45+ minutes (lots of exploration) | Under 15 minutes | Track time from signup to first program with `status: active` |
| Form submission completion rate | ~60% (no inline validation, no progress indicator) | 85%+ | `form_analytics` table: started vs submitted ratio |
| Form abandonment on payment page | Unknown | Under 10% | Track payment_status transitions: pending → paid vs pending → stale |
| Judge review completion rate | 0% (portal incomplete) | 90%+ | `submission_judges`: assigned vs completed ratio |
| Accessibility audit score (axe/Lighthouse) | ~40 (estimate based on findings) | 90+ | Run Lighthouse accessibility audit on key pages |
| Error message comprehension | Low (raw error strings) | High (all human-readable) | Manual review: zero raw error strings exposed to users |
| Empty state coverage | ~20% of views | 100% of views | Audit: every list/table view has a designed empty state |
| Time to complete judge review (per submission) | N/A (not functional) | Under 10 minutes | Track time from first score entry to review submission per submission_judge |
| Mobile usability score (Lighthouse) | ~70 (estimate) | 95+ | Lighthouse mobile audit |
| Net Promoter Score (NPS) | Unmeasured | 50+ | In-app survey after key milestones (program published, judging complete) |
