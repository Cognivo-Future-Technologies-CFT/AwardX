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
    .select('submission_id, submissions(id, category_id, applicant_id, submission_data)')
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
    .select('id, user_id, name, email, bio, status')
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
    const submissionApplicantId = (enrollment as any).submissions?.applicant_id || null;
    let assignedCount = 0;
    let attempts = 0;
    const maxAttempts = judges.length * 2;

    while (assignedCount < judgesPerSubmission && attempts < maxAttempts) {
      const judge = judges[judgeIndex % judges.length];
      const isSelfAssignment = Boolean(submissionApplicantId && judge.user_id && submissionApplicantId === judge.user_id);
      const key = `${submissionId}:${judge.id}`;
      if (!existing.has(key) && !isSelfAssignment) {
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
      const enrollment = enrollments.find((item) => item.submission_id === submissionId) as any;
      const submissionApplicantId = enrollment?.submissions?.applicant_id || null;
      let assignedCount = 0;
      let attempts = 0;
      const maxAttempts = judgePool.length * 2;
      let jIdx = offset;

      while (assignedCount < judgesPerSubmission && attempts < maxAttempts) {
        const judge = judgePool[jIdx % judgePool.length];
        const isSelfAssignment = Boolean(submissionApplicantId && judge.user_id && submissionApplicantId === judge.user_id);
        const key = `${submissionId}:${judge.id}`;
        if (!existing.has(key) && !isSelfAssignment) {
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
