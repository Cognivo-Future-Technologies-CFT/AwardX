import { serviceJson } from '../serviceResult.js';
export async function submitJudgeScores(supabase, input) {
    const { token, submissionJudgeId, criteriaScores, overallComment } = input;
    const { data: judge, error: judgeError } = await supabase
        .from('judges')
        .select('id, status')
        .eq('invite_token', token)
        .single();
    if (judgeError || !judge) {
        return serviceJson(401, { error: 'Invalid or expired invite token.' });
    }
    if (judge.status !== 'active') {
        return serviceJson(403, { error: 'Judge account is no longer active' });
    }
    const { data: assignment, error: assignmentError } = await supabase
        .from('submission_judges')
        .select('id, submission_id, submissions!inner(program_id)')
        .eq('id', submissionJudgeId)
        .eq('judge_id', judge.id)
        .maybeSingle();
    if (assignmentError || !assignment) {
        return serviceJson(403, { error: 'You are not assigned to this submission.' });
    }
    const programId = assignment.submissions?.program_id;
    const criterionIds = Array.from(new Set(criteriaScores.map((cs) => cs.criterionId)));
    const { data: criteriaRows, error: criteriaError } = await supabase
        .from('judging_criteria')
        .select('id, min_score, max_score')
        .eq('program_id', programId)
        .in('id', criterionIds);
    if (criteriaError) {
        return serviceJson(500, { error: 'Failed to validate judging criteria.' });
    }
    const criteriaById = new Map((criteriaRows || []).map((c) => [c.id, c]));
    for (const cs of criteriaScores) {
        const criterion = criteriaById.get(cs.criterionId);
        if (!criterion) {
            return serviceJson(400, { error: `Invalid criterion: ${cs.criterionId}` });
        }
        const min = Number(criterion.min_score ?? 0);
        const max = Number(criterion.max_score ?? 100);
        if (!Number.isFinite(cs.score) || cs.score < min || cs.score > max) {
            return serviceJson(400, {
                error: `Score for criterion ${cs.criterionId} must be between ${min} and ${max}.`,
            });
        }
    }
    const scoreRows = criteriaScores.map((cs) => ({
        submission_judge_id: submissionJudgeId,
        criterion_id: cs.criterionId,
        score: cs.score,
        comment: cs.comment || null,
        scored_at: new Date().toISOString(),
    }));
    const { error: scoresError } = await supabase
        .from('scores')
        .upsert(scoreRows, { onConflict: 'submission_judge_id,criterion_id' });
    if (scoresError) {
        return serviceJson(500, { error: scoresError.message || 'Failed to save scores.' });
    }
    if (overallComment) {
        await supabase
            .from('judge_comments')
            .upsert({
            submission_judge_id: submissionJudgeId,
            overall_comment: overallComment,
            submitted_at: new Date().toISOString(),
        }, { onConflict: 'submission_judge_id' });
    }
    await supabase
        .from('submission_judges')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', submissionJudgeId);
    return serviceJson(200, { ok: true });
}
