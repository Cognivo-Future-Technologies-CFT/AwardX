# Usability Test Script

## Protocol

- Method: Moderated think-aloud
- Session length: 35-45 minutes
- Device setup:
  - Admin: desktop required
  - Judge: desktop primary + mobile spot checks
  - Entrant: desktop and mobile mix
- Data captured: completion, time on task, errors, confidence rating, quote

## Severity scale

- 1 = cosmetic friction
- 2 = minor slowdown
- 3 = major slowdown / repeated confusion
- 4 = blocker / task failure

## Success criteria

- Task success: user completes without moderator intervention.
- Partial success: user completes with hints.
- Failure: user cannot complete.

---

## Admin tasks

### Task A1: Publish readiness
Prompt: "You are launching submissions tomorrow. Check if your award is ready to publish and fix any blockers."

Observe:
- Can user find readiness status quickly?
- Can user identify blockers without searching multiple screens?
- Does user trust the final status?

Metrics:
- Time to identify all blockers
- Number of navigation hops
- Confidence score (1-7)

### Task A2: Post-publish date adjustment
Prompt: "Judging start date moved by 2 days. Update schedule safely after publish."

Observe:
- User expectation for edit permissions
- Fear around breaking live program
- Need for confirmation/audit feedback

### Task A3: Invite team member to role
Prompt: "Invite a new judge coordinator for this event."

Observe:
- Can user assign role correctly?
- Can user understand pending invite state?
- Urgency behavior and error recovery

---

## Judge tasks

### Task J1: Find and score a specific entry
Prompt: "You have 10 assigned entries. Find the entry from [company] and score it."

Observe:
- Efficiency of list/search/filter
- Layout preference: split panel vs screen switching
- Rubric comprehension speed

### Task J2: Edit previous score comment
Prompt: "You already scored entry #4. Go back and update your comment."

Observe:
- Ease of returning to prior work
- Visibility of save status
- Fear of overwriting

### Task J3: Filter to unscored only
Prompt: "Show only entries you still need to score."

Observe:
- Discoverability of filter controls
- Queue mental model and completion visibility

---

## Entrant tasks

### Task E1: Pre-check requirements
Prompt: "Before starting, find what is required for a complete submission."

Observe:
- Clarity of requirements upfront
- Trust signal before time investment

### Task E2: Start, save, and resume draft
Prompt: "Fill initial details, save draft, and return to where you left off."

Observe:
- Confidence in save persistence
- Resume location accuracy
- Anxiety markers

### Task E3: Submit and verify completion
Prompt: "Complete and submit. Confirm that your submission is received."

Observe:
- Confirmation trust quality
- Need for email receipt / tracking artifact

---

## Post-task prompts

- What felt easiest in this task?
- What felt risky or unclear?
- If this were real and deadline-driven, what would worry you most?

## Session debrief capture

- Top 3 frictions:
- Highest severity issue:
- Most confidence-building UI element:
- Most trust-damaging UI element:
- Priority recommendation:
