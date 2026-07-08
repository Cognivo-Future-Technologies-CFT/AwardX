import { Router } from 'express';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase.js';

const router = Router();

router.post('/judge-submit', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const { token, submissionJudgeId, criteriaScores, overallComment } = req.body || {};

		if (!token || !submissionJudgeId || !Array.isArray(criteriaScores) || criteriaScores.length === 0) {
			return res.status(400).json({ error: 'Missing required fields: token, submissionJudgeId, criteriaScores' });
		}

		const supabase = getSupabaseAdmin();

		// 1. Authenticate via invite token
		const { data: judge, error: judgeError } = await supabase
			.from('judges')
			.select('id, status')
			.eq('invite_token', token)
			.single();

		if (judgeError || !judge) {
			return res.status(401).json({ error: 'Invalid or expired invite token.' });
		}

		// 2. Verify judge owns this assignment
		const { data: assignment, error: assignmentError } = await supabase
			.from('submission_judges')
			.select('id, submission_id, submissions!inner(program_id)')
			.eq('id', submissionJudgeId)
			.eq('judge_id', judge.id)
			.maybeSingle();

		if (assignmentError || !assignment) {
			return res.status(403).json({ error: 'You are not assigned to this submission.' });
		}

		const programId = (assignment as any).submissions?.program_id;

		// 3. Validate criteria
		const criterionIds = criteriaScores.map((cs: any) => cs.criterionId);
		const { data: criteriaRows } = await supabase
			.from('judging_criteria')
			.select('id, min_score, max_score')
			.eq('program_id', programId)
			.in('id', criterionIds);

		const criteriaById = new Map((criteriaRows || []).map((c: any) => [c.id, c]));
		for (const cs of criteriaScores) {
			const criterion = criteriaById.get(cs.criterionId);
			if (!criterion) {
				return res.status(400).json({ error: `Invalid criterion: ${cs.criterionId}` });
			}
		}

		// 4. Upsert scores
		const scoreRows = criteriaScores.map((cs: any) => ({
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
			return res.status(500).json({ error: scoresError.message || 'Failed to save scores.' });
		}

		// 5. Save overall comment
		if (overallComment) {
			await supabase
				.from('judge_comments')
				.upsert(
					{ submission_judge_id: submissionJudgeId, overall_comment: overallComment, submitted_at: new Date().toISOString() },
					{ onConflict: 'submission_judge_id' },
				);
		}

		// 6. Mark completed
		await supabase
			.from('submission_judges')
			.update({ status: 'completed', completed_at: new Date().toISOString() })
			.eq('id', submissionJudgeId);

		return res.json({ ok: true });
	} catch (error: any) {
		console.error('Judge submit scores error:', error);
		return res.status(500).json({ error: error?.message || 'Internal server error' });
	}
});

export default router;
