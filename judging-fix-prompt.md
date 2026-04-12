**AwardX Judging System — Agent Team Prompt**

Fix all 41 identified issues across judging, submission, assignment, scoring, and invite subsystems.
React + TypeScript + Supabase + Vercel serverless API routes + React Query + Sonner toasts.
All fixes must be surgical — no full rewrites, preserve existing patterns, maintain backward compatibility.

---

**Agent Teams**

**Agent 1: Database & Schema Fixes**
Fix all data-layer integrity issues that cause silent data corruption or broken persistence.
Must run as Supabase migrations — no manual SQL or destructive schema changes.
Coordinate with Agent 3 to ensure API code matches updated schema constraints.

Tasks:
1. Add `UNIQUE (submission_judge_id, criterion_id)` constraint on `scores` table — the upsert key used by `submitScores()` has no backing constraint, causing duplicate rows on rescore
2. Add DB trigger `AFTER INSERT ON submission_judges` → increment `judges.assigned_count` by 1
3. Add DB trigger `AFTER UPDATE ON submission_judges` when `status` changes to `'completed'` → increment `judges.completed_count` by 1
4. Add DB trigger `AFTER DELETE ON submission_judges` → decrement `judges.assigned_count` by 1 (and `completed_count` if status was `'completed'`)
5. Add `UNIQUE (submission_id, judge_id)` constraint on `submission_judges` to prevent duplicate assignments
6. Add DB trigger or function to recalculate `submissions.average_score` whenever `scores` rows are inserted/updated/deleted — compute weighted average using `judging_criteria.weight`
7. Verify `judge_comments` upsert key: confirm `submission_judge_id` unique constraint exists (schema shows it — good)

---

**Agent 2: API & Security Fixes**
Fix all serverless API endpoints under `/api/invites/` and create new endpoints for judge-portal scoring.
Preserve rate limiting, Zod validation, and email logging patterns already established.
Coordinate with Agent 1 for schema changes and Agent 3 for frontend integration.

Tasks:
1. Create `POST /api/scores/judge-submit` — a new endpoint that authenticates via invite token (not Supabase auth), validates the judge owns the `submission_judge_id`, and calls score-saving logic. This unblocks external judges who have no Supabase session
2. Fix `verify-judge.ts` — decide and implement consistent token behavior: either truly one-time (add `if (judge.invite_token_used_at) return 403`) or reusable (remove "one-time link" language from email templates in `judge.ts` lines 99 and 134-137)
3. Fix `resend.ts` line 166 — allow resend for judges with status `'invited'` OR `'active'`, not just `'invited'`, so admins can regenerate portal links for judges who lost access
4. Fix `judge.ts` lines 38-45 — when `RESEND_API_KEY` is missing, return a response that the frontend can detect and show a warning toast ("Email not configured — invite created but email not sent") instead of silent 200 OK
5. Parallelize `verify-judge.ts` queries — after finding the judge (query 1) and updating token (query 2), run queries 3-6 (program, assignments, criteria, org name) in `Promise.all()` to halve portal load time
6. Add `sortOrder` to criteria response in `verify-judge.ts` line 186-193 — currently omitted, causing arbitrary criteria order on judge portal

---

**Agent 3: Frontend Component Fixes**
Fix all broken UI components, dead buttons, misleading visuals, and UX inconsistencies.
Use existing patterns: Sonner toasts for feedback, React Query invalidation for data refresh, Lucide icons.
Coordinate with Agent 2 for new API endpoints; coordinate with Agent 1 for updated data shapes.

Tasks — JudgeScoringModal (`components/dashboard/JudgeScoringModal.tsx`):
1. Pre-populate scores when re-opening modal — on mount, check `existingScores` for entries matching `effectiveSubmissionJudgeId` and populate `scores`, `comments`, `overallComment` state instead of always resetting to empty
2. Fix "Unsaved changes" showing on fresh open — add an `isDirty` flag, only show save state text after user modifies a field, show "Ready to score" or nothing on initial open
3. Add inline warning when score is clamped — after `clampScore()` modifies input value, show brief toast or inline `text-amber-600` message: "Score adjusted to max (100)"
4. Fix responsive layout — replace `w-[60%]` / `w-[40%]` with responsive classes: stack vertically on screens below `lg:`, side-by-side on `lg:` and above
5. Fix admin scoring identity — line 113 uses `assignedJudges[0]` as preferred judge, causing admin scores to overwrite first judge's scores. Either show a read-only view for admins (no save button) or resolve assignment based on current user's judge record

Tasks — JudgingView (`components/dashboard/JudgingView.tsx`):
6. Wire mail button on judge cards — line 554-556, add `onClick` handler calling `resendJudgeInvite(judge.id, activeEvent?.title)` with loading state and toast feedback
7. Fix "View Scores" fallback — line 545-547, remove `?? submissions[0]` fallback. If no assigned submission found, disable the button with a tooltip "No assignments found"
8. Fix empty row `colSpan` — line 838, change `colSpan={6}` to `colSpan={7}` to match the 7-column table header
9. Disable "Assign Judges" button when no submissions selected — line 765, add `disabled={selectedIds.length === 0}` and update label to show count: `Assign Judges (${selectedIds.length})`
10. Block scorecard save when weights ≠ 100% — in `handleSaveCriteria()`, add guard: `if (totalWeight !== 100 && criteriaDraft.length > 0) { toast.error('Weights must total 100%'); return; }`
11. Wrap `refreshAll` in `useCallback` — prevent realtime subscription from re-creating on every render
12. Make `allOrgJudges` query lazy — set `enabled: !!activeEvent?.id && isAssignModalOpen` so it only fetches when the assign modal is open

Tasks — JudgePortalPage (`components/pages/JudgePortalPage.tsx`):
13. Fix fake progress bars — line 409, replace `Math.min(35 + idx * 12, 85)` with `0` for pending submissions. Only show `100%` for completed
14. Separate token verification from data refresh — extract a `fetchAssignments()` function that only refetches assignments/criteria without re-verifying the token. Use this in `onScored` callback instead of full `verifyToken()` re-run
15. Show notice for deleted submissions — instead of silently filtering, count filtered items and show "N submission(s) no longer available" banner if count > 0
16. Add `onError` fallback on cover images — add `onError={(e) => e.currentTarget.style.display = 'none'}` on `<img>` tags

Tasks — SubmissionDetailModal (`components/dashboard/SubmissionDetailModal.tsx`):
17. Fix judge ID display — line 93-97, accept a `judgeNameById` map prop and display names instead of `jid.substring(0, 8)...`
18. Fix form data access — line 25, change `submissionData?.responses` to `submissionData` directly, matching `FormDataViewer` in JudgeScoringModal
19. Remove or wire "Edit Submission" button — line 150-154, either add navigation to edit view or remove the button entirely

Tasks — LeaderboardView:
20. No changes needed — component is well-structured

---

**Rules**

* Never delete existing comments or docstrings unrelated to the fix
* Every DB change must be a numbered migration file in `supabase/migrations/`
* Every API endpoint must use the established patterns: Zod validation, rate limiting, auth check, email logging
* Use `toast.success()` / `toast.error()` for all user-facing feedback — no `alert()` or `console.log()` user messages
* All React Query mutations must invalidate relevant query keys after success
* Test each fix in isolation — a regression in one fix must not block others
* Preserve TypeScript strict typing — no `any` casts unless matching existing patterns
* Mobile responsiveness is required for all modal and portal changes
