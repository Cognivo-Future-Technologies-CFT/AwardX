# Schedule & Rounds Implementation Plan

## Objective
Stabilize and secure schedule/rounds by fixing critical authorization gaps, making advancement execution atomic, preventing workflow edge corruption, and establishing reliable automated test coverage.

## Scope
- Backend APIs:
  - `server/src/routes/roundExecution.ts`
  - `server/src/routes/scheduleRounds.ts`
  - `server/src/routes/judgeAssignment.ts`
- Backend services:
  - `server/src/services/advancementEngine.ts`
  - `server/src/services/votingEngine.ts` (race fallback hardening)
- Frontend:
  - `components/dashboard/scheduleRounds/ScheduleRoundsView.tsx`
- Tests (new):
  - `tests/unit/scheduleRounds/*.test.ts`
  - `tests/integration/scheduleRounds/*.test.ts` (or nearest existing integration convention)

## Non-Goals
- Full product redesign of workflow builder UX.
- Broad schema redesign outside schedule/rounds reliability.
- Refactoring unrelated modules.

## Guiding Principles
- Enforce authorization at route layer before any mutation.
- Ensure multi-step advancement either fully succeeds or fully rolls back.
- Preserve user-authored graph edges by default.
- Keep behavior backwards-compatible where possible.
- Add tests for every bug class fixed.

## Implementation Phases

### Phase 0 - Preconditions (0.5 day)
1. Confirm current branch status and baseline behavior in staging/local.
2. Identify shared authorization helper(s) already used in `advancement.ts` and reuse the same pattern.
3. Confirm DB capabilities for transaction strategy:
   - Preferred: SQL function / RPC wrapping advancement in one transaction.
   - Alternate: server-side compensation strategy if RPC cannot be added immediately.

Deliverable:
- Short implementation note with chosen transaction approach.

---

### Phase 1 - P0 Security Hardening (1 day)
Target: block unauthorized mutations for rounds/schedule operations.

Tasks:
1. Add explicit authorization checks in:
   - `roundExecution` routes (`activate`, `complete`, `finalize`, `cancel`).
   - `scheduleRounds` routes (`POST/PUT/DELETE rounds`, `PUT edges`, active-form updates).
   - `judgeAssignment` routes (`assign`, `clear`, `remove`).
2. Eliminate trust of client-provided `program_id` where possible:
   - Derive `program_id` from `roundId` server-side before executing assignment.
3. Return consistent status codes:
   - `403` for unauthorized.
   - `404` for inaccessible/non-existent resources where applicable.

Acceptance Criteria:
- Unauthorized users cannot mutate round lifecycle, edges, or assignments.
- Existing authorized admin/program manager flows continue to work.
- Route tests cover positive and negative auth scenarios.

---

### Phase 2 - P0 Advancement Atomicity (1.5-2 days)
Target: prevent partial advancement state.

Tasks:
1. Move `executeAdvancement` write path into transactional unit.
   - Includes creation of event/details, round_submissions updates, enrollments, transitions, and audit.
2. Ensure lock semantics are transaction-safe and idempotent.
3. Standardize finalization state:
   - Either update `rounds.status` to `finalized` when appropriate, or align transition logging to actual persisted status model.
4. Define deterministic error handling contract:
   - Errors must not leave partial writes.

Acceptance Criteria:
- Simulated mid-process failures roll back all advancement writes.
- Re-running advancement after a failure does not duplicate artifacts.
- Transition and round status semantics are consistent.

---

### Phase 3 - P1 Workflow Integrity (1 day)
Target: stop linear scheduler from unintentionally overwriting graph edges.

Tasks:
1. In `ScheduleRoundsView`, remove implicit calls that always persist linear edges on load/update/reorder.
2. Add explicit mode boundary:
   - Linear mode can save linear edges only when user confirms conversion, or only if no custom graph exists.
3. Add guard rails:
   - Detect non-linear/conditional edges and warn before destructive overwrite.

Acceptance Criteria:
- Existing conditional/branching edges are preserved by default.
- Any destructive conversion requires explicit user action.
- UI tests or component-level tests verify no hidden edge rewrites.

---

### Phase 4 - P1/P2 Validation + Concurrency Hardening (1 day)
Target: improve input integrity and race resistance.

Tasks:
1. Add server-side validation for round payloads:
   - Allowed `type`, allowed `status`, valid date ordering, settings schema checks.
2. Add validation for edge payloads and assignment config bounds.
3. In `votingEngine`, remove or harden non-atomic fallback increment path.
4. Add consistent error payload shape for validation failures (`400` with field hints).

Acceptance Criteria:
- Invalid payloads rejected early with clear errors.
- Vote count updates remain correct under concurrent load tests.

---

### Phase 5 - Test Coverage Expansion (1-1.5 days)
Target: lock in fixes and prevent regressions.

Required test suites:
1. Authorization tests
   - Cross-org/cross-program mutation attempts for all touched routes.
2. Advancement lifecycle tests
   - Completed-only execution rule.
   - Tie boundary pause behavior.
   - Overrides and tie resolutions.
   - Rollback behavior under injected failures.
3. Routing/edges tests
   - First-match semantics (if retained) explicitly documented and tested.
   - Unroutable participant path returns safe error and no partial writes.
4. Validation tests
   - Invalid types/statuses/dates/settings rejected.
5. UI integrity tests
   - Graph edges not overwritten by passive linear scheduler actions.

Acceptance Criteria:
- New schedule/round test suites run green in CI.
- Critical paths have regression tests tied to known bugs.

---

## Rollout Strategy
1. Deploy in small PRs:
   - PR1: Auth hardening.
   - PR2: Transactional advancement.
   - PR3: UI edge-preservation changes.
   - PR4: Validation + race fixes + tests.
2. Feature flags (optional but recommended):
   - `ROUND_ADVANCEMENT_TX_ENABLED`
   - `SCHEDULE_LINEAR_OVERWRITE_PROTECTION`
3. Monitor after deploy:
   - Advancement failure rate.
   - Unauthorized mutation attempts (403 metrics).
   - Round transition anomalies.

## Risk Register
- Transaction migration complexity could delay rollout.
  - Mitigation: ship auth fixes first; gate transactional path with flag.
- Behavior change in edge routing may impact operators.
  - Mitigation: communicate clearly and add in-app warnings.
- Legacy and new schedule models may still conflict.
  - Mitigation: define single source of truth in follow-up RFC.

## Definition of Done
- P0 auth gaps closed and verified.
- Advancement writes are atomic and idempotent.
- Edge overwrite bug removed or safely gated.
- Validation and concurrency issues addressed.
- Tests added for all fixed bug classes.
- Plan outcomes documented in changelog/release notes.

## Suggested Execution Order (Fastest Safe Path)
1. Phase 1 (Auth)  
2. Phase 2 (Atomic advancement)  
3. Phase 5 subset for P0 tests  
4. Phase 3 (Workflow integrity)  
5. Phase 4 + remaining Phase 5 tests
