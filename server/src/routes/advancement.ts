import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';
import { getRound } from '../services/roundEngine.js';
import { executeAdvancement, getAdvancementHistory, previewAdvancement } from '../services/advancementEngine.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

const ALLOWED_ROLE_NAMES = new Set(['admin', 'program manager']);
const ALLOWED_PERMISSION_KEYS = new Set(['manage_programs', 'manage_judging']);

async function canManageAdvancement(userId: string, programId: string) {
  const supabase = getSupabaseAdmin();

  const { data: program } = await supabase
    .from('programs')
    .select('organization_id')
    .eq('id', programId)
    .maybeSingle();

  if (!program?.organization_id) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.organization_id === program.organization_id) {
    return true;
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('status, roles(name, permissions)')
    .eq('organization_id', program.organization_id)
    .eq('user_id', userId)
    .eq('status', 'active');

  return (memberships || []).some((membership: any) => {
    const roleName = String(membership.roles?.name || '').toLowerCase().trim();
    const rolePermissions = Array.isArray(membership.roles?.permissions)
      ? membership.roles.permissions.map((value: unknown) => String(value).toLowerCase().trim())
      : [];
    return ALLOWED_ROLE_NAMES.has(roleName) || rolePermissions.some((permission: string) => ALLOWED_PERMISSION_KEYS.has(permission));
  });
}

router.post('/rounds/:roundId/preview', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageAdvancement(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const data = await previewAdvancement(roundId, req.body?.criteriaOverride);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/execute', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageAdvancement(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await executeAdvancement(
      roundId,
      req.body?.overrides,
      req.userId,
      req.body?.criteriaOverride,
      req.body?.tieResolutions,
    );

    if (!result.ok) {
      return res.status(400).json({
        error: result.error || 'Failed to execute advancement',
        paused: result.paused || false,
        reason: result.reason || null,
        ties: result.ties || [],
      });
    }

    await Promise.all([
      deleteCache(cacheKeys.programRounds(round.program_id)),
      deleteCache(cacheKeys.pipelineStatus(round.program_id)),
      deleteCache(cacheKeys.advancementHistory(round.program_id)),
    ]);

    return res.json({ data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/override', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  const { submissionId, action, reason } = req.body || {};

  if (!submissionId || !action || !reason) {
    return res.status(400).json({ error: 'submissionId, action, and reason are required' });
  }
  if (!['force_advance', 'force_eliminate'].includes(action)) {
    return res.status(400).json({ error: 'Invalid override action' });
  }

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageAdvancement(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await executeAdvancement(
      roundId,
      [{ submissionId, action, reason }],
      req.userId,
      req.body?.criteriaOverride,
      req.body?.tieResolutions,
    );

    if (!result.ok) {
      return res.status(400).json({
        error: result.error || 'Failed to apply override',
        paused: result.paused || false,
        reason: result.reason || null,
        ties: result.ties || [],
      });
    }

    await Promise.all([
      deleteCache(cacheKeys.programRounds(round.program_id)),
      deleteCache(cacheKeys.pipelineStatus(round.program_id)),
      deleteCache(cacheKeys.advancementHistory(round.program_id)),
    ]);

    return res.json({ data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/programs/:programId/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;

  try {
    const permitted = await canManageAdvancement(req.userId || '', programId);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const data = await wrapWithCache(cacheKeys.advancementHistory(programId), cacheTtls.short, async () => {
      return getAdvancementHistory(programId);
    });

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
