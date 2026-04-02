# UX Analysis Prompt — Claude Code Edition
> Drop this into any web app project via Claude Code. It will read your entire codebase,
> then write UXplan.md and UXtodo.md directly into your project root.

---

## HOW TO RUN

Open your project in Claude Code and run:

```bash
claude --dangerously-skip-permissions "$(cat UX_ANALYSIS_PROMPT.md | sed -n '/^---BEGIN PROMPT---$/,/^---END PROMPT---$/p' | sed '1d;$d')"
```

Or open Claude Code interactively in your project root and paste everything between the BEGIN/END markers below.

---

---BEGIN PROMPT---

You are a world-class UX architect, product designer, and senior frontend engineer.

Your job is to deeply analyse this entire web application codebase, identify every UX problem, and produce two files — `UXplan.md` and `UXtodo.md` — written directly into the project root. The output must be specific, honest, and immediately actionable. The target standard: this web app's user experience must be best-in-class — better than tools like Awardforce, with the clarity of Linear, the confidence of Stripe, and the efficiency of Notion.

Do not ask for clarification. Read first, then write.

---

## STEP 1 — READ THE ENTIRE PROJECT

Use your file tools to systematically read:

1. `package.json` / `package-lock.json` — understand the stack (React, Vue, Next.js, etc.)
2. All route/page files — map every screen in the app
3. All component files — understand the UI building blocks
4. All API/service files — understand what data flows through the UI
5. State management files (Redux, Zustand, Context, Pinia, etc.)
6. CSS/styling files — Tailwind config, CSS modules, styled-components, design tokens
7. `README.md` and any `/docs` folder
8. `.env.example` — understand integrations and environment
9. Any existing test files — understand what's considered critical behaviour
10. Any i18n / copy files — understand the language and tone used

As you read, build a mental model of:
- **What this app does** and who it's for
- **Every user flow** from landing to goal completion
- **The component hierarchy** and how screens are composed
- **Where state lives** and how data moves
- **What's inconsistent, missing, or broken** from a UX perspective

---

## STEP 2 — AUDIT ACROSS ALL UX DIMENSIONS

Evaluate the codebase honestly across every dimension below. For each, note specific files, components, or patterns that are problematic.

### 2.1 Information Architecture
- Is the navigation structure logical for the user's mental model?
- Are labels clear, consistent, and jargon-free?
- Can a new user understand where they are at all times?
- Is content grouped in ways that match user tasks — not internal system structure?
- Are there orphaned pages, dead ends, or missing back-navigation?

### 2.2 User Flows & Task Completion
- Trace every core flow (sign up, onboarding, primary action, settings, error recovery)
- Count the steps required. Are any flows unnecessarily long?
- Where do users have to think hard, re-read, or backtrack?
- Are forms split sensibly? Are required fields minimal and justified?
- Is progress communicated (multi-step flows, async operations)?

### 2.3 Interaction Design
- Are all interactive elements obviously clickable/tappable?
- Is feedback immediate for every user action (loading, success, error)?
- Are errors specific, human-readable, and actionable — not generic?
- Are destructive actions confirmed? Are they reversible where possible?
- Are keyboard shortcuts present for power users?
- Are modals/dialogs used appropriately (not overused)?
- Do dropdowns, selects, and pickers have sensible defaults?

### 2.4 Visual Hierarchy & Layout
- Is the most important action always visually dominant on each screen?
- Is spacing consistent? Are there magic numbers hardcoded throughout?
- Is typography used to create clear hierarchy (size, weight, colour)?
- Are there walls of text that should be broken up?
- Is whitespace used purposefully, or are screens cluttered?
- Are lists, tables, and data displays scannable?

### 2.5 Design System Consistency
- Are components reused or reimplemented differently in different places?
- Are colours, fonts, border-radii, shadows defined as tokens or hardcoded?
- Are button styles consistent? Are there 4 different "primary button" variants?
- Are icons from a consistent set, or a mix of libraries?
- Do similar patterns look and behave the same everywhere?

### 2.6 Empty States & Edge Cases
- What does a new user with no data see? Is it helpful or a blank void?
- What happens on load errors? Are error states designed, or just raw error text?
- What happens when search returns no results?
- Are 404 / permission-denied / session-expired states handled gracefully?
- Are loading states designed (skeletons > spinners for content areas)?

### 2.7 Onboarding & First-Time Experience
- Does the app explain its value immediately?
- Is there a guided first-run experience, or are users thrown in cold?
- Are tooltips, walkthroughs, or contextual hints present where needed?
- Is it possible to explore before committing (e.g. before completing a form)?

### 2.8 Forms & Data Entry
- Are all form labels visible (not just placeholders that disappear on type)?
- Is inline validation used (on blur, not on submit)?
- Are password fields maskable?
- Do date pickers work on mobile?
- Are long forms broken into logical steps?
- Is autofill/autocomplete enabled where appropriate?
- Are character limits shown proactively (not only after violation)?

### 2.9 Performance UX
- Are there unhandled loading states (blank screens while fetching)?
- Are skeleton screens used for content that loads asynchronously?
- Is optimistic UI used for mutations (e.g. toggling, deleting)?
- Are images lazy-loaded and properly sized?
- Are large data tables paginated or virtualised?
- Is there any perceived performance issue (jank, layout shift, slow transitions)?

### 2.10 Accessibility
- Do all interactive elements have visible focus states (not just browser default)?
- Does colour contrast meet WCAG AA (4.5:1 body text, 3:1 UI elements)?
- Are all images given descriptive alt text?
- Are form inputs properly associated with labels (`<label for>` or `aria-label`)?
- Are error messages linked to their fields (`aria-describedby`)?
- Does keyboard navigation work end-to-end without a mouse?
- Are ARIA roles and landmarks used correctly (`<main>`, `<nav>`, `<header>`)?
- Does the app respect `prefers-reduced-motion`?
- Is there a logical, linear heading hierarchy (h1 → h2 → h3)?
- Are modals/dialogs focus-trapped and closeable via Escape?

### 2.11 Responsive & Mobile Web
- Does the layout degrade gracefully from desktop → tablet → mobile?
- Are tap targets at least 44×44px?
- Is there any horizontal scroll at mobile widths?
- Are hover-only interactions replicated for touch?
- Are modals and overlays usable on small screens?
- Does the app use the correct input types on mobile (`type="email"`, `type="tel"`)?

### 2.12 Microcopy & Tone
- Is the copy consistent in voice and tone throughout?
- Are button labels action-oriented verbs (not "Submit", "OK", "Yes")?
- Are error messages human and helpful (not `Error: 422 Unprocessable Entity`)?
- Are confirmation dialogs specific (not "Are you sure?")?
- Are empty states written with personality and a clear next action?
- Is jargon or internal terminology leaking into the UI?
- Are tooltips and helper text present where the UI alone is ambiguous?

### 2.13 Trust & Confidence
- Does the app communicate clearly what it's doing with user data?
- Are pricing, plans, and limitations clearly communicated?
- Are there confirmation emails / receipts for important actions?
- Is sensitive information (passwords, payment) handled with visible care?
- Are success states celebrated enough (not just silently completing)?

---

## STEP 3 — WRITE UXplan.md

Create `UXplan.md` in the project root with the following structure. Be specific — cite actual component names, file paths, and code patterns. Do not be vague.

```markdown
# UX Improvement Plan
_Last analysed: [date]_
_Stack: [framework, styling, state management]_

---

## Executive Summary

[3 paragraphs. Paragraph 1: what this app is and who it's for. Paragraph 2: the most critical UX problems found — honest and direct. Paragraph 3: the vision for the improved experience and what achieving it would mean for users.]

---

## User Personas

[2–4 personas derived from the app's actual purpose and user flows found in the code.]

### Persona 1: [Name]
- **Role**: [e.g. Small business owner, Admin, End user]
- **Primary goal**: [What they want to accomplish]
- **Key tasks**: [Top 3–4 things they do in the app]
- **Current frustrations**: [Specific friction points from the audit]
- **What success looks like**: [How they feel when the app works perfectly]

[repeat for each persona]

---

## Current State Audit

### What's Working Well
[Specific things that are already good — with file/component references]

### Critical Issues
[Issues that block task completion or severely damage trust. Ranked by severity.]

| # | Issue | Where | Impact |
|---|-------|--------|--------|
| 1 | [description] | `path/to/component` | [user impact] |

### High Priority Issues
[Issues that create meaningful friction or inconsistency]

| # | Issue | Where | Impact |
|---|-------|--------|--------|

### Medium Priority Issues
[Issues that hurt polish and confidence but don't block]

| # | Issue | Where | Impact |
|---|-------|--------|--------|

### Low Priority / Polish
[Minor inconsistencies, small copy issues, aesthetic gaps]

| # | Issue | Where | Impact |
|---|-------|--------|--------|

---

## User Flow Analysis

[For each major flow in the app:]

### Flow: [Name, e.g. "New User Onboarding"]
**Entry point**: [route/component]
**Goal**: [what the user is trying to achieve]

**Current steps**:
1. [step]
2. [step]
...

**Problems**:
- [specific issue with step N]

**Redesigned flow**:
1. [improved step]
2. [improved step]
...

**Key changes**: [summary of what's different and why]

---

## Information Architecture

### Current IA
[Map of current navigation / routes as a tree]

### Problems
[Specific issues with labelling, grouping, hierarchy]

### Proposed IA
[Revised structure with rationale]

---

## Design System Gaps

[List all inconsistencies, missing tokens, and component divergences found in the codebase. Reference specific files.]

### Colours
[Hardcoded hex values found, missing semantic tokens, contrast issues]

### Typography
[Inconsistent font sizes, weights, or line-heights found]

### Spacing
[Magic numbers, inconsistent gaps, missing scale]

### Components
[Reimplemented components, inconsistent variants, missing states]

---

## Accessibility Findings

| Issue | WCAG Criterion | Severity | Location |
|-------|---------------|----------|----------|
| [description] | [e.g. 1.4.3 Contrast] | [Critical/High/Medium] | `path/to/file` |

---

## Microcopy Rewrites

[The worst offenders — before/after rewrites for the most impactful copy changes]

| Location | Current | Improved | Why |
|----------|---------|----------|-----|
| `Component` | "[current text]" | "[improved text]" | [rationale] |

---

## Quick Wins
[Changes achievable in under a day each, with outsized UX impact]

1. **[Title]** — [description, file reference, expected impact]

---

## Strategic Improvements
[Larger changes requiring design + development time]

1. **[Title]** — [description, rationale, rough scope]

---

## The Vision: Ideal Experience

[A narrative paragraph written as if describing the finished product to a new user. What does it feel like? What can they do effortlessly? What did they not have to think about?]

---

## How to Measure Success

| Metric | Current (estimated) | Target | How to Measure |
|--------|--------------------|---------| ---------------|
| [e.g. Time to complete primary flow] | [Xs] | [Ys] | [method] |
```

---

## STEP 4 — WRITE UXtodo.md

Create `UXtodo.md` in the project root. This is the developer's working checklist. Every task must be specific enough to pick up without asking questions.

```markdown
# UX Todo
_Generated from UX analysis. Work top-to-bottom within each priority tier._
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

- [ ] **[Task title]** [XS/S/M/L/XL]
  - **File(s)**: `src/components/ExampleComponent.tsx`
  - **Problem**: [Specific description of what's wrong and how it hurts users]
  - **Fix**: [Exact description of what to change — be prescriptive]
  - **Done when**: [Acceptance criteria — how to verify it's fixed]

[Repeat for all critical items found in audit]

---

## High Priority

[Same format]

---

## Medium Priority

[Same format]

---

## Low Priority / Polish

[Same format]

---

## New Features for Best-in-Class UX

Features that don't exist yet but would meaningfully elevate the experience above competitors:

- [ ] **[Feature name]** [L/XL]
  - **Rationale**: [Why this matters — tie to a specific user persona or flow]
  - **Implementation notes**: [Brief technical direction, component/API shape]
  - **Priority**: Critical/High/Medium

---

## Accessibility Checklist

Work through these systematically. Check off each when verified:

### Keyboard Navigation
- [ ] Every interactive element is reachable by Tab
- [ ] Tab order follows visual reading order
- [ ] Focus is never lost (e.g. after closing a modal)
- [ ] Modals trap focus and close on Escape
- [ ] Custom components (dropdowns, tabs, date pickers) implement correct ARIA patterns

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

---

## Microcopy Rewrites

Apply these specific copy changes across the codebase:

| File / Component | Current Text | Replace With | Priority |
|-----------------|-------------|-------------|----------|
| `src/...` | "[current]" | "[improved]" | Critical/High/Medium |

---

## Design Token Standardisation

Replace hardcoded values with design tokens. Address these files:

### Spacing
- [ ] Audit all px values in CSS/Tailwind — replace with scale tokens
- [ ] Files to update: [list files with most magic numbers]

### Colour
- [ ] Audit all hardcoded hex values — replace with semantic tokens
- [ ] Define and apply: --color-primary, --color-danger, --color-success, etc.
- [ ] Files to update: [list files]

### Typography
- [ ] Define a type scale (xs, sm, base, lg, xl, 2xl) and enforce it
- [ ] Remove any font-size declarations outside the design system
- [ ] Files to update: [list files]

### Other
- [ ] Standardise border-radius (define 3–4 levels: sm, md, lg, full)
- [ ] Standardise box-shadow (define 3 levels: sm, md, lg)
- [ ] Standardise transition durations (fast: 100ms, base: 200ms, slow: 300ms)

---

## Completed

_Move items here with completion date_

- [x] [Task] — completed [date]
```

---

## STEP 5 — REPORT BACK

After writing both files, output a plain-prose summary covering:

1. **The 5 most impactful changes** — the ones that will make the biggest difference to users, in order
2. **The single worst UX problem found** — be blunt
3. **The single best thing about the current UX** — be fair
4. **Estimated total effort** — rough time to complete all critical + high priority items
5. **The one feature that would make this best-in-class** — if you could only add one thing

Reference actual parts of the codebase. No bullet points — write it as paragraphs.

---END PROMPT---

---

## TIPS FOR BEST RESULTS

- **Run from the project root** — Claude Code needs to be able to read all files from the working directory
- **Use `--dangerously-skip-permissions`** if you want Claude Code to write both files without prompting you for each write operation
- **Re-run after major features** — UX debt accumulates; audit quarterly at minimum
- **Use `UXtodo.md` as your sprint board** — filter by Critical and High for each sprint, ignore the rest until later
- **The bar to beat** — Awardforce is capable but cluttered. The standard is: every flow completable with zero hesitation, zero rereading, and zero frustration. If a user hesitates even once, that's a bug.

---

_Prompt v2.0 — Claude Code, web apps, full strategy + granular todos_