import type { Round } from '../types/scheduleRounds';
import { isVotingRoundType } from './roundScheduleUtils';

export function isAnnounceRoundType(type: Round['type']): boolean {
  const normalized = String(type || '').toLowerCase();
  return normalized === 'announce' || normalized === 'announcement';
}

export function participantPillLabel(round: Round, total: number, loading?: boolean): string {
  if (loading) return 'Loading…';
  if (total === 0) {
    return round.type === 'Nomination' ? 'Enroll submissions' : 'No entries yet';
  }
  if (round.type === 'Nomination') {
    return `${total} ${total === 1 ? 'nomination' : 'nominations'}`;
  }
  return `${total} ${total === 1 ? 'entry' : 'entries'}`;
}

export function participantMetricLabel(round: Round): 'votes' | 'score' {
  return isVotingRoundType(round.type) ? 'votes' : 'score';
}

export async function fetchVoteCountsBySubmission(
  supabase: { from: (table: string) => any },
  roundId: string,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('public_votes')
    .select('submission_id')
    .eq('round_id', roundId);

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const id = row.submission_id as string;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

type JudgeAssignmentRow = {
  submission_id: string;
  scores?: Array<{
    score: number;
    judging_criteria?: { weight?: number; max_score?: number } | null;
  }> | null;
};

export async function fetchJudgeScoresBySubmission(
  supabase: { from: (table: string) => any },
  roundId: string,
  programId: string,
  submissionIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (submissionIds.length === 0) return result;

  const { data: assignments } = await supabase
    .from('submission_judges')
    .select(`
      submission_id,
      scores(score, judging_criteria(weight, max_score))
    `)
    .in('submission_id', submissionIds)
    .or(`round_id.eq.${roundId},round_id.is.null`);

  const { data: criteriaList } = await supabase
    .from('judging_criteria')
    .select('id, weight')
    .eq('program_id', programId);

  const totalPossibleWeight =
    (criteriaList || []).reduce((sum: number, c: { weight?: number }) => sum + (c?.weight ?? 100), 0) || 100;

  const scoreMap: Record<string, { totalPercentageSum: number; judgeCount: number }> = {};

  for (const assignment of (assignments || []) as JudgeAssignmentRow[]) {
    const scores = assignment.scores || [];
    if (scores.length === 0) continue;

    const subId = assignment.submission_id;
    if (!scoreMap[subId]) scoreMap[subId] = { totalPercentageSum: 0, judgeCount: 0 };

    let judgeWeightedSum = 0;
    for (const s of scores) {
      const weight = s.judging_criteria?.weight ?? 100;
      const maxScore = (s.judging_criteria?.max_score ?? 0) > 0 ? (s.judging_criteria?.max_score as number) : 10;
      judgeWeightedSum += (s.score / maxScore) * weight;
    }

    const judgePercentage = (judgeWeightedSum / totalPossibleWeight) * 100;
    scoreMap[subId].totalPercentageSum += judgePercentage;
    scoreMap[subId].judgeCount += 1;
  }

  for (const [submissionId, entry] of Object.entries(scoreMap)) {
    if (entry.judgeCount > 0) {
      result.set(submissionId, entry.totalPercentageSum / entry.judgeCount);
    }
  }

  return result;
}
