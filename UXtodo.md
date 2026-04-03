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
  - **Done when**: Login and signup pages show only functional OAuth options (Google).

- [ ] **Add `role="navigation"` and `aria-current` to sidebar** [XS]
  - **File(s)**: `components/dashboard/DashboardLayout.tsx`
  - **Problem**: The dashboard sidebar is a `<div>` with no semantic navigation role. The active view has visual highlighting but no `aria-current="page"` for screen readers.
  - **Fix**: Wrap the sidebar nav items in `<nav role="navigation" aria-label="Dashboard navigation">`. Add `aria-current="page"` to the active sidebar item.
  - **Done when**: Screen readers announce the sidebar as navigation and identify the current page.

- [ ] **Replace div-based toggles with semantic checkbox inputs** [S]
  - **File(s)**: `components/dashboard/SubmissionProcessView.tsx`, `components/dashboard/ReachView.tsx`, `components/dashboard/JudgingView.tsx`
  - **Problem**: Toggle switches are `<div>` elements with `onClick` handlers. They're invisible to screen readers and can't be operated via keyboard.
  - **Fix**: Create a shared `Toggle` component using `<input type="checkbox" role="switch">` with proper `<label>`, `aria-checked`, and keyboard support. Style it with Tailwind to match current visual design. Replace all div-based toggles.
  - **Done when**: All toggles are keyboard-operable, screen-reader-announced, and use semantic HTML.

- [ ] **Fix CSV export hardcoded headers** [S]
  - **File(s)**: `components/dashboard/DashboardOverview.tsx`
  - **Problem**: CSV export uses hardcoded column headers that don't match actual form field names. Exported data may be misleading for admins making decisions.
  - **Fix**: Dynamically generate CSV headers from the program's form fields. Include submission metadata (ID, status, date, applicant, category) as standard columns, then append form-specific field labels.
  - **Done when**: Exported CSV headers match the actual submission form fields and all data columns align correctly.

- [ ] **Add password strength indicator to signup** [S]
  - **File(s)**: `components/pages/SignupPage.tsx`
  - **Problem**: No password strength feedback. No confirmation field. Users may set weak passwords or mistype without knowing.
  - **Fix**: Add a password strength meter (weak/fair/strong) below the password field that updates on keypress. Check length (8+), mixed case, numbers, symbols. Add a "Confirm password" field that validates match on blur.
  - **Done when**: Signup shows password strength in real-time and requires password confirmation.

- [ ] **Add `aria-expanded` to mobile menu toggle** [XS]
  - **File(s)**: `components/Header.tsx`
  - **Problem**: Mobile hamburger menu button doesn't indicate its state to screen readers.
  - **Fix**: Add `aria-expanded={isMenuOpen}` and `aria-controls="mobile-menu"` to the menu button. Add `id="mobile-menu"` to the menu panel.
  - **Done when**: Screen readers announce "expanded" or "collapsed" state of the mobile menu.

- [ ] **Add `aria-selected` to all tab interfaces** [S]
  - **File(s)**: `components/dashboard/JudgingView.tsx`, `components/dashboard/TeamsView.tsx`, `components/dashboard/SettingsView.tsx`
  - **Problem**: Tab-based navigation (Overview/Panel/Scorecard/Assignments in Judging, Members/Roles in Teams, Profile/Organization/Billing in Settings) uses styled buttons but no ARIA tab pattern.
  - **Fix**: Implement the ARIA tabs pattern: `role="tablist"` on container, `role="tab"` + `aria-selected` + `aria-controls` on each tab button, `role="tabpanel"` + `id` + `aria-labelledby` on each panel. Add keyboard navigation: Arrow Left/Right to switch tabs.
  - **Done when**: Tabs follow the WAI-ARIA tabs pattern and are fully keyboard-navigable.

- [ ] **Fix helper text contrast ratio** [XS]
  - **File(s)**: Global — search for `text-slate-400` used on white/light backgrounds
  - **Problem**: `text-slate-400` (#94a3b8) on white backgrounds has a 3.4:1 contrast ratio. WCAG AA requires 4.5:1 for normal text.
  - **Fix**: Replace `text-slate-400` with `text-slate-500` (#64748b, 4.6:1 ratio) for all helper text, descriptions, and secondary labels on light backgrounds. Keep `text-slate-400` only for decorative/non-essential text.
  - **Done when**: All readable text on light backgrounds meets 4.5:1 contrast ratio.

- [ ] **Add judge re-invite mechanism** [M]
  - **File(s)**: `components/dashboard/JudgingView.tsx`, `api/invites/judge.ts`, `api/invites/verify-judge.ts`
  - **Problem**: Judge invite tokens are one-time use. If a judge accidentally opens the link (or their email client pre-fetches it), they lose access permanently with no recovery path.
  - **Fix**: Add a "Resend invite" button in JudgingView for each judge. The endpoint should: (1) generate a new token, (2) update the judge record, (3) reset `invite_token_used_at`, (4) send a new email. Also consider making the token create a session rather than being one-time — the session persists but the token is still invalidated.
  - **Done when**: Admins can resend judge invites; judges who lost access can be re-invited.

- [ ] **Add `prefers-reduced-motion` support** [S]
  - **File(s)**: `components/Button.tsx`, `components/Modal.tsx`, all Framer Motion usage
  - **Problem**: Framer Motion animations play regardless of user preference. Users with vestibular disorders may experience discomfort.
  - **Fix**: Use Framer Motion's `useReducedMotion()` hook to detect preference. When reduced motion is preferred, disable or simplify animations: no scale transforms, no spring physics, instant transitions. Apply globally via a motion config provider.
  - **Done when**: All animations respect `prefers-reduced-motion`; users with this setting see instant transitions.

- [ ] **Replace in-memory rate limiting with distributed solution** [S]
  - **File(s)**: `api/_utils/rateLimit.ts`
  - **Problem**: Rate limiting uses an in-memory Map. On Vercel's serverless infrastructure, each function instance has its own memory — so rate limits are per-instance, providing almost no real protection.
  - **Fix**: Replace with Upstash Redis rate limiting (Vercel-compatible). Use `@upstash/ratelimit` package with a sliding window algorithm. Keep the same limits (10-20 req/15min per IP).
  - **Done when**: Rate limiting persists across function instances and survives cold starts.

---

## Low Priority / Polish

- [ ] **Remove "Protected by reCAPTCHA" claim** [XS]
  - **File(s)**: `components/pages/LoginPage.tsx:321`
  - **Problem**: Footer states "Protected by reCAPTCHA" but no reCAPTCHA is implemented. This is a false claim.
  - **Fix**: Remove the "Protected by reCAPTCHA" text. Replace with just the copyright notice, or implement reCAPTCHA.
  - **Done when**: Footer doesn't claim protections that aren't implemented.

- [ ] **Remove non-functional "Remember me" checkbox** [XS]
  - **File(s)**: `components/pages/LoginPage.tsx:295-299`
  - **Problem**: The "Remember me" checkbox renders but has no functional implementation. Supabase handles session persistence automatically.
  - **Fix**: Remove the "Remember me" checkbox and its label. If needed later, implement it by configuring Supabase session duration.
  - **Done when**: No non-functional UI elements on the login page.

- [ ] **Fix avatar fallback for special character names** [XS]
  - **File(s)**: `components/Header.tsx`
  - **Problem**: Avatar fallback uses the first character of the user's name. For names starting with emoji, special characters, or non-Latin scripts, this may render poorly.
  - **Fix**: Use `name.codePointAt(0)` to get the first grapheme. Better yet, generate a color-based avatar from the user's ID hash and show initials (first + last initial).
  - **Done when**: Avatar fallback works correctly for all Unicode names.

- [ ] **Add alt text to chart components** [S]
  - **File(s)**: `components/dashboard/DashboardOverview.tsx`, `components/dashboard/AnalyticsView.tsx`
  - **Problem**: Recharts graphs have no text alternatives. Screen reader users get no information from the charts.
  - **Fix**: Add a visually-hidden summary below each chart: "Bar chart showing submission trends over the last 30 days. Peak: 45 submissions on March 15." Use `aria-hidden="true"` on the chart SVG and provide the text alternative.
  - **Done when**: Every chart has an accessible text description of its data.

- [ ] **Fix dashboard initialization timeout UX** [XS]
  - **File(s)**: `components/dashboard/Dashboard.tsx`
  - **Problem**: Dashboard initialization has a 10-second timeout. If it fails, the user sees an endless spinner with no error message.
  - **Fix**: After timeout, show an error state: "Dashboard is taking longer than expected. [Retry] [Go to Settings]". Log the error to Sentry.
  - **Done when**: Users see a helpful error message instead of an endless spinner on initialization failure.

- [ ] **Add `aria-label` to all icon-only buttons** [S]
  - **File(s)**: Multiple — `DashboardOverview.tsx`, `SubmissionTable.tsx`, `FormBuilderView.tsx`, `CategoriesView.tsx`, `JudgingView.tsx`
  - **Problem**: Buttons containing only Lucide icons (edit, delete, copy, refresh, settings gear) have no accessible name.
  - **Fix**: Add `aria-label` to each icon-only button describing its action: `aria-label="Delete form"`, `aria-label="Copy link"`, `aria-label="Edit category"`, etc.
  - **Done when**: Every icon-only button has a descriptive `aria-label`.

- [ ] **Fix submission detail modal scroll behavior** [XS]
  - **File(s)**: `components/dashboard/SubmissionDetailModal.tsx`
  - **Problem**: Form responses are constrained to `max-h-[300px]` with overflow scroll — creating a scroll-within-a-scroll on the modal. Long submissions are cumbersome to read.
  - **Fix**: Remove the fixed max-height. Let the modal body scroll naturally (the modal already has `max-h-[90vh]` with `overflow-y-auto`).
  - **Done when**: Submission responses display fully within the modal's natural scroll area without nested scrolling.

---

## New Features for Best-in-Class UX

- [ ] **Onboarding wizard for new program admins** [L]
  - **Rationale**: Sarah (admin persona) currently lands on an empty dashboard with no guidance. A guided setup flow reduces time-to-value from 45+ minutes to under 15 minutes.
  - **Implementation notes**: Create `OnboardingWizard` component with steps: Program Details → Categories → Form Setup → Judging Config → Preview & Launch. Store progress in `user_workspace_state`. Show a checklist in the dashboard sidebar until all steps complete. Detect first-run via absence of programs.
  - **Priority**: High

- [ ] **Toast notification system** [M]
  - **Rationale**: Currently, success/error feedback is implemented differently in every view — inline divs, alerts, console.log. A centralized toast system ensures consistent, accessible feedback for every user action.
  - **Implementation notes**: Create `ToastContext` + `ToastProvider` wrapping the app. `useToast()` hook returns `toast.success()`, `toast.error()`, `toast.info()`. Render toasts in a portal at bottom-right. Include dismiss button, configurable duration (default 5s), queue for multiple toasts. Use `aria-live="polite"` for screen reader announcements.
  - **Priority**: High

- [ ] **URL-based dashboard routing** [L]
  - **Rationale**: The current client-side `currentView` state means: no deep links, no browser back/forward, no shareable URLs, no proper page titles for bookmarks. This is a fundamental navigation limitation.
  - **Implementation notes**: Convert dashboard to React Router nested routes: `/dashboard/overview`, `/dashboard/program/:id/submissions`, etc. Use `<Outlet>` for nested content. Migrate `currentView` state to URL params. Update sidebar links to `<NavLink>`. Add `<title>` management with `react-helmet-async` or route-level titles.
  - **Priority**: High

- [ ] **Shared form input component library** [M]
  - **Rationale**: Every form in the app rebuilds inputs with slightly different styling, validation, and accessibility. A shared library ensures consistency and accessibility by default.
  - **Implementation notes**: Create: `Input` (text, email, password, number, tel), `Select`, `Textarea`, `Checkbox`, `Toggle`, `RadioGroup`, `DatePicker`. Each component includes: visible `<label>`, `aria-describedby` for error/help text, consistent error styling, focus ring, disabled state. Build with Tailwind, expose via `components/ui/` directory.
  - **Priority**: Medium

- [ ] **Real-time draft save indicator** [XS]
  - **Rationale**: James (applicant persona) fills multi-page forms and has no visual confirmation that his progress is saved. Anxiety about data loss causes premature submissions or abandonment.
  - **Implementation notes**: In `FormSubmissionPage`, show a small badge near the form title: "Saving..." (while the draft save is in flight), "Saved just now" (on success, fade after 3s), "Save failed — retrying..." (on error). Use React Query mutation state.
  - **Priority**: High

- [ ] **Applicant-to-organizer messaging** [L]
  - **Rationale**: James has no way to ask questions about the submission process. He must find contact info externally, which breaks the flow and reduces completion rates.
  - **Implementation notes**: Add a "Questions?" floating button on the public form page that opens a simple message form (name, email, message). Store in `contact_messages` table (already exists). Show messages in the admin dashboard under a "Messages" section. Send email notification to org admin.
  - **Priority**: Medium

- [ ] **Keyboard shortcuts for power users** [M]
  - **Rationale**: Program admins who manage hundreds of submissions benefit from keyboard efficiency. Linear-style keyboard navigation would differentiate AwardX from competitors.
  - **Implementation notes**: Implement a keyboard shortcut system: `?` to show shortcut list, `g o` for overview, `g s` for submissions, `g j` for judging, `/` for search, `j/k` for list navigation, `Enter` to open, `Escape` to close. Use a `useHotkeys` hook. Show shortcuts in a help modal.
  - **Priority**: Low

- [ ] **Multi-language support (i18n)** [XL]
  - **Rationale**: AwardX serves global organizations. Program pages, submission forms, and the judge portal should support multiple languages to broaden reach.
  - **Implementation notes**: Integrate `react-i18next`. Extract all UI strings to JSON locale files. Start with English as base, add support for Spanish, French, Hindi. Allow program admins to set the language of their public pages and forms. Judge portal should respect the program's language setting.
  - **Priority**: Low

---

## Accessibility Checklist

Work through these systematically. Check off each when verified:

### Keyboard Navigation
- [ ] Every interactive element is reachable by Tab
- [ ] Tab order follows visual reading order
- [ ] Focus is never lost (e.g. after closing a modal)
- [ ] Modals trap focus and close on Escape
- [ ] Custom components (dropdowns, tabs, date pickers) implement correct ARIA patterns
- [ ] Skip-to-content link present and functional

### Colour & Contrast
- [ ] Body text contrast >= 4.5:1 (WCAG AA)
- [ ] UI element contrast >= 3:1 (WCAG AA)
- [ ] Information is never conveyed by colour alone
- [ ] Focus indicators are visible at 3:1 contrast against adjacent colours

### Screen Readers
- [ ] All images have descriptive alt text (decorative images have alt="")
- [ ] All form inputs have associated label or aria-label
- [ ] Error messages are linked to their inputs via aria-describedby
- [ ] Dynamic content updates are announced via aria-live
- [ ] Page has one h1 and a logical heading hierarchy
- [ ] main, nav, header, footer landmarks are present
- [ ] Icon-only buttons have aria-label

### Motion & Sensory
- [ ] All animations respect prefers-reduced-motion
- [ ] No flashing content (>3 flashes per second)
- [ ] Time limits (if any) are adjustable or can be turned off

---

## Mobile Web Checklist

- [ ] No horizontal scroll at 375px, 390px, or 414px viewport width
- [ ] All tap targets >= 44x44px (buttons, links, checkboxes, etc.)
- [ ] Forms use correct input types: email, tel, number, url, search
- [ ] Inputs use autocomplete attributes where appropriate
- [ ] Date/time pickers are usable on mobile (consider native inputs)
- [ ] Modals and drawers don't overflow or hide behind the browser chrome
- [ ] Font size is >= 16px for body text (prevents iOS auto-zoom on input focus)
- [ ] No hover-only interactions without touch equivalents
- [ ] Touch gestures (swipe, pinch) are used only where expected
- [ ] Dashboard sidebar collapses to bottom nav or drawer on mobile

---

## Microcopy Rewrites

Apply these specific copy changes across the codebase:

| File / Component | Current Text | Replace With | Priority |
|-----------------|-------------|-------------|----------|
| `components/dashboard/DashboardOverview.tsx` | `"No submissions to export"` | `"Nothing to export yet. Submissions will appear once applicants start submitting."` | High |
| `components/ErrorBoundary.tsx` | `"Try Again"` | `"Reload this section"` | Medium |
| `components/pages/LoginPage.tsx` | Raw: `"Invalid login credentials"` | `"That email and password combination doesn't match. Check your spelling or reset your password."` | High |
| `components/dashboard/DashboardOverview.tsx` | `"Action Needed"` | `"Awaiting Review"` | Medium |
| `components/dashboard/DashboardOverview.tsx` | `"Online"` (for judges) | `"Active"` | Medium |
| `components/ProtectedRoute.tsx` | `"Checking authentication..."` | `"Loading..."` | Low |
| `components/AuthCallback.tsx` | `"Authentication successful! Redirecting..."` | `"You're in! Taking you to your dashboard..."` | Low |
| `components/pages/LoginPage.tsx` | `"Protected by reCAPTCHA."` | Remove entirely | Low |

---

## Design Token Standardisation

Replace hardcoded values with design tokens. Address these files:

### Spacing
- [ ] Audit all arbitrary px values in Tailwind classes — ensure consistent use of the spacing scale (2, 3, 4, 6, 8, 12, 16)
- [ ] Files to update: `DashboardLayout.tsx` (category tree indentation), `SubmissionDetailModal.tsx` (max-h-[300px]), `Dashboard.tsx`, `Modal.tsx`

### Colour
- [ ] Define semantic colour tokens: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`
- [ ] Map status colours to semantic tokens instead of raw Tailwind colours (green-500, red-500, amber-500)
- [ ] Audit all `text-slate-400` usage on light backgrounds — replace with `text-slate-500` for contrast
- [ ] Files to update: `SubmissionTable.tsx`, `SubmissionDetailModal.tsx`, `MySubmissionsPage.tsx`, `DashboardOverview.tsx`, `JudgingView.tsx`

### Typography
- [ ] Standardise page title sizes: all views should use `text-2xl font-bold font-display` for consistency
- [ ] Define and enforce body text size: `text-sm` for dense UIs (tables, forms), `text-base` for content areas
- [ ] Files to update: `DashboardOverview.tsx`, `SubmissionTable.tsx`, `JudgingView.tsx`, `CategoriesView.tsx`, `SettingsView.tsx`

### Other
- [ ] Standardise border-radius: `rounded-lg` (8px) for cards, `rounded-xl` (12px) for modals/large containers, `rounded-full` for avatars/badges
- [ ] Standardise box-shadow: use Tailwind `shadow-sm`, `shadow`, `shadow-lg` consistently — remove one-off shadow values
- [ ] Standardise transition durations: ensure all hover/focus transitions use `duration-200` or `duration-300` consistently

---

## Completed

_Move items here with completion date_

