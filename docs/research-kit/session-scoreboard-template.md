# Live Session Scoreboard Template

Use one row per task per participant. Copy into Sheets/Notion/Airtable as needed.

## Column schema

- Session ID
- Date
- Persona (Admin/Judge/Entrant)
- Participant ID
- Task ID
- Task name
- Completed (Y/N/Partial)
- Time (seconds)
- Errors count
- Hints needed (0/1/2+)
- Severity (1-4)
- Confidence rating after task (1-7)
- Quote snippet
- Observer notes

## Task catalog

### Admin tasks
- A1 Publish readiness and blocker resolution
- A2 Post-publish date edit
- A3 Invite team member with role

### Judge tasks
- J1 Find and score target entry
- J2 Re-open scored entry and edit comment
- J3 Filter to unscored entries only

### Entrant tasks
- E1 Find all requirements before starting
- E2 Save draft and resume later
- E3 Submit and verify confirmation

## Scoring guidance

- Completion:
  - Y = no moderator intervention
  - Partial = completed with hints or workaround
  - N = failed

- Severity:
  - 1 cosmetic
  - 2 minor slowdown
  - 3 major slowdown/confusion
  - 4 blocker

## Ready-to-paste CSV header

Session ID,Date,Persona,Participant ID,Task ID,Task name,Completed,Time (seconds),Errors count,Hints needed,Severity (1-4),Confidence rating (1-7),Quote snippet,Observer notes

## Daily rollup metrics

- Task success rate by persona
- Median time on task by persona
- Blocker count (severity 4) by task
- Average confidence by task
- Top repeated friction labels

## Friction label taxonomy (optional)

- NAV_DISCOVERY
- REQUIREMENTS_CLARITY
- SAVE_CONFIDENCE
- FILTERING
- ROLE_PERMISSIONS
- PUBLISH_RISK
- COLLABORATION_GAP
- CONFIRMATION_TRUST
