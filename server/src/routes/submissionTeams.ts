import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

/**
 * POST /api/submission-teams
 * Create a new submission team (caller becomes team lead)
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId, name } = req.body;
  const userId = req.userId!;

  if (!programId || !name?.trim()) {
    return res.status(400).json({ error: 'programId and name are required' });
  }

  const supabase = getSupabaseAdmin();

  // Verify program exists and has group submission mode
  const { data: program, error: progErr } = await supabase
    .from('programs')
    .select('id, submission_mode, min_team_size, max_team_size, status')
    .eq('id', programId)
    .maybeSingle();

  if (progErr || !program) {
    return res.status(404).json({ error: 'Program not found' });
  }

  if (program.submission_mode !== 'group') {
    return res.status(400).json({ error: 'This program does not support group submissions' });
  }

  if (program.status !== 'active') {
    return res.status(400).json({ error: 'Program is not accepting submissions' });
  }

  // Check if user is already in a team for this program
  const { data: existingMembership } = await supabase
    .from('submission_team_members')
    .select('id, team_id, submission_teams!inner(program_id, status)')
    .eq('user_id', userId)
    .eq('submission_teams.program_id', programId)
    .neq('submission_teams.status', 'disbanded')
    .maybeSingle();

  if (existingMembership) {
    return res.status(409).json({
      error: 'You are already in a team for this program',
      teamId: existingMembership.team_id,
    });
  }

  // Create team
  const { data: team, error: teamErr } = await supabase
    .from('submission_teams')
    .insert({
      program_id: programId,
      name: name.trim(),
      team_lead_id: userId,
      status: 'forming',
    })
    .select()
    .single();

  if (teamErr) {
    return res.status(500).json({ error: teamErr.message });
  }

  // Add team lead as a member
  const { error: memberErr } = await supabase
    .from('submission_team_members')
    .insert({
      team_id: team.id,
      user_id: userId,
      role: 'lead',
    });

  if (memberErr) {
    // Rollback team creation
    await supabase.from('submission_teams').delete().eq('id', team.id);
    return res.status(500).json({ error: memberErr.message });
  }

  return res.status(201).json({ team });
});

/**
 * GET /api/submission-teams/my-team?programId=xxx
 * Get current user's team for a specific program
 */
router.get('/my-team', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.query;
  const userId = req.userId!;

  if (!programId) {
    return res.status(400).json({ error: 'programId query parameter is required' });
  }

  const supabase = getSupabaseAdmin();

  // Find the user's team for this program
  const { data: membership } = await supabase
    .from('submission_team_members')
    .select(`
      id, role,
      submission_teams!inner(
        id, name, program_id, team_lead_id, submission_id,
        invite_code, status, created_at, updated_at
      )
    `)
    .eq('user_id', userId)
    .eq('submission_teams.program_id', programId as string)
    .neq('submission_teams.status', 'disbanded')
    .maybeSingle();

  if (!membership) {
    return res.json({ team: null });
  }

  const team = (membership as any).submission_teams;

  // Get all team members with their profiles
  const { data: members } = await supabase
    .from('submission_team_members')
    .select('id, user_id, role, joined_at')
    .eq('team_id', team.id);

  // Get member profiles
  const memberUserIds = (members || []).map((m: any) => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', memberUserIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  const enrichedMembers = (members || []).map((m: any) => ({
    ...m,
    profile: profileMap.get(m.user_id) || null,
  }));

  return res.json({
    team: {
      ...team,
      members: enrichedMembers,
      memberCount: enrichedMembers.length,
      isLead: team.team_lead_id === userId,
    },
  });
});

/**
 * POST /api/submission-teams/:teamId/join
 * Join a team using invite code
 */
router.post('/:teamId/join', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { teamId } = req.params;
  const { inviteCode } = req.body;
  const userId = req.userId!;

  if (!inviteCode) {
    return res.status(400).json({ error: 'inviteCode is required' });
  }

  const supabase = getSupabaseAdmin();

  // Verify team and invite code
  const { data: team, error: teamErr } = await supabase
    .from('submission_teams')
    .select('id, program_id, invite_code, status, team_lead_id')
    .eq('id', teamId)
    .maybeSingle();

  if (teamErr || !team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.invite_code !== inviteCode) {
    return res.status(403).json({ error: 'Invalid invite code' });
  }

  if (team.status !== 'forming') {
    return res.status(400).json({ error: 'Team is no longer accepting members' });
  }

  // Check team size against program limits
  const { data: program } = await supabase
    .from('programs')
    .select('max_team_size, status')
    .eq('id', team.program_id)
    .single();

  if (!program || program.status !== 'active') {
    return res.status(400).json({ error: 'Program is not accepting submissions' });
  }

  // Count current members
  const { count: memberCount } = await supabase
    .from('submission_team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId);

  if ((memberCount ?? 0) >= program.max_team_size) {
    return res.status(400).json({ error: 'Team is full' });
  }

  // Check if user is already in a team for this program
  const { data: existingMembership } = await supabase
    .from('submission_team_members')
    .select('id, team_id, submission_teams!inner(program_id, status)')
    .eq('user_id', userId)
    .eq('submission_teams.program_id', team.program_id)
    .neq('submission_teams.status', 'disbanded')
    .maybeSingle();

  if (existingMembership) {
    return res.status(409).json({
      error: 'You are already in a team for this program',
      teamId: existingMembership.team_id,
    });
  }

  // Add member
  const { error: memberErr } = await supabase
    .from('submission_team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role: 'member',
    });

  if (memberErr) {
    return res.status(500).json({ error: memberErr.message });
  }

  return res.json({ success: true, teamId });
});

/**
 * POST /api/submission-teams/join-by-code
 * Join a team using only invite code (no teamId needed)
 */
router.post('/join-by-code', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { inviteCode, programId } = req.body;
  const userId = req.userId!;

  if (!inviteCode) {
    return res.status(400).json({ error: 'inviteCode is required' });
  }

  const supabase = getSupabaseAdmin();

  // Find team by invite code
  let query = supabase
    .from('submission_teams')
    .select('id, program_id, invite_code, status, team_lead_id')
    .eq('invite_code', inviteCode)
    .eq('status', 'forming');

  if (programId) {
    query = query.eq('program_id', programId);
  }

  const { data: team, error: teamErr } = await query.maybeSingle();

  if (teamErr || !team) {
    return res.status(404).json({ error: 'Invalid or expired invite code' });
  }

  // Check team size against program limits
  const { data: program } = await supabase
    .from('programs')
    .select('max_team_size, status')
    .eq('id', team.program_id)
    .single();

  if (!program || program.status !== 'active') {
    return res.status(400).json({ error: 'Program is not accepting submissions' });
  }

  const { count: memberCount } = await supabase
    .from('submission_team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id);

  if ((memberCount ?? 0) >= program.max_team_size) {
    return res.status(400).json({ error: 'Team is full' });
  }

  // Check if user is already in a team for this program
  const { data: existingMembership } = await supabase
    .from('submission_team_members')
    .select('id, team_id, submission_teams!inner(program_id, status)')
    .eq('user_id', userId)
    .eq('submission_teams.program_id', team.program_id)
    .neq('submission_teams.status', 'disbanded')
    .maybeSingle();

  if (existingMembership) {
    return res.status(409).json({
      error: 'You are already in a team for this program',
      teamId: existingMembership.team_id,
    });
  }

  // Add member
  const { error: memberErr } = await supabase
    .from('submission_team_members')
    .insert({
      team_id: team.id,
      user_id: userId,
      role: 'member',
    });

  if (memberErr) {
    return res.status(500).json({ error: memberErr.message });
  }

  return res.json({ success: true, teamId: team.id });
});

/**
 * DELETE /api/submission-teams/:teamId/members/:memberId
 * Remove a member (team lead only) or leave team (self)
 */
router.delete('/:teamId/members/:memberId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { teamId, memberId } = req.params;
  const userId = req.userId!;

  const supabase = getSupabaseAdmin();

  // Get team info
  const { data: team } = await supabase
    .from('submission_teams')
    .select('id, team_lead_id, status')
    .eq('id', teamId)
    .single();

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.status === 'submitted') {
    return res.status(400).json({ error: 'Cannot modify team after submission' });
  }

  // Get the member record
  const { data: member } = await supabase
    .from('submission_team_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('team_id', teamId)
    .single();

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Can't remove the team lead
  if (member.role === 'lead') {
    return res.status(400).json({ error: 'Cannot remove the team lead. Disband the team instead.' });
  }

  // Must be team lead or the member themselves
  if (userId !== team.team_lead_id && userId !== member.user_id) {
    return res.status(403).json({ error: 'Only the team lead or the member themselves can remove a member' });
  }

  const { error: deleteErr } = await supabase
    .from('submission_team_members')
    .delete()
    .eq('id', memberId);

  if (deleteErr) {
    return res.status(500).json({ error: deleteErr.message });
  }

  return res.json({ success: true });
});

/**
 * POST /api/submission-teams/:teamId/disband
 * Disband a team (team lead only)
 */
router.post('/:teamId/disband', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { teamId } = req.params;
  const userId = req.userId!;

  const supabase = getSupabaseAdmin();

  const { data: team } = await supabase
    .from('submission_teams')
    .select('id, team_lead_id, status')
    .eq('id', teamId)
    .single();

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.team_lead_id !== userId) {
    return res.status(403).json({ error: 'Only the team lead can disband the team' });
  }

  if (team.status === 'submitted') {
    return res.status(400).json({ error: 'Cannot disband a team that has already submitted' });
  }

  const { error } = await supabase
    .from('submission_teams')
    .update({ status: 'disbanded', updated_at: new Date().toISOString() })
    .eq('id', teamId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true });
});

/**
 * POST /api/submission-teams/:teamId/mark-ready
 * Mark team as ready for submission (team lead only, validates min size)
 */
router.post('/:teamId/mark-ready', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { teamId } = req.params;
  const userId = req.userId!;

  const supabase = getSupabaseAdmin();

  const { data: team } = await supabase
    .from('submission_teams')
    .select('id, team_lead_id, program_id, status')
    .eq('id', teamId)
    .single();

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.team_lead_id !== userId) {
    return res.status(403).json({ error: 'Only the team lead can mark the team as ready' });
  }

  if (team.status !== 'forming') {
    return res.status(400).json({ error: 'Team is not in forming state' });
  }

  // Check minimum team size
  const { data: program } = await supabase
    .from('programs')
    .select('min_team_size')
    .eq('id', team.program_id)
    .single();

  const { count: memberCount } = await supabase
    .from('submission_team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId);

  if ((memberCount ?? 0) < (program?.min_team_size ?? 2)) {
    return res.status(400).json({
      error: `Team needs at least ${program?.min_team_size ?? 2} members to be ready`,
      currentCount: memberCount,
      required: program?.min_team_size ?? 2,
    });
  }

  const { error } = await supabase
    .from('submission_teams')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', teamId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true });
});

/**
 * POST /api/submission-teams/:teamId/link-submission
 * Link a submission to the team (called after team lead submits)
 */
router.post('/:teamId/link-submission', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { teamId } = req.params;
  const { submissionId } = req.body;
  const userId = req.userId!;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  const supabase = getSupabaseAdmin();

  const { data: team } = await supabase
    .from('submission_teams')
    .select('id, team_lead_id, program_id, status')
    .eq('id', teamId)
    .single();

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.team_lead_id !== userId) {
    return res.status(403).json({ error: 'Only the team lead can link a submission' });
  }

  if (team.status !== 'ready' && team.status !== 'forming') {
    return res.status(400).json({ error: 'Team has already submitted or is disbanded' });
  }

  // Verify the submission belongs to the team lead for this program
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, program_id, applicant_id')
    .eq('id', submissionId)
    .eq('program_id', team.program_id)
    .eq('applicant_id', userId)
    .maybeSingle();

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found or not owned by team lead' });
  }

  const { error } = await supabase
    .from('submission_teams')
    .update({
      submission_id: submissionId,
      status: 'submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', teamId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true });
});

/**
 * GET /api/submission-teams/:teamId/chat
 * Get chat messages for a team
 */
router.get('/:teamId/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { teamId } = req.params;
  const userId = req.userId!;
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const before = req.query.before as string | undefined;

  const supabase = getSupabaseAdmin();

  // Verify user is a member of this team
  const { data: membership } = await supabase
    .from('submission_team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this team' });
  }

  // Check if chat is still active
  const { data: chatActive } = await supabase.rpc('is_team_chat_active', { p_team_id: teamId });

  let query = supabase
    .from('team_chat_messages')
    .select('id, team_id, sender_id, message, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: messages, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Get sender profiles
  const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', senderIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  const enrichedMessages = (messages || []).reverse().map((m: any) => ({
    ...m,
    sender: profileMap.get(m.sender_id) || null,
  }));

  return res.json({
    messages: enrichedMessages,
    chatActive: chatActive ?? true,
  });
});

/**
 * POST /api/submission-teams/:teamId/chat
 * Send a chat message
 */
router.post('/:teamId/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { teamId } = req.params;
  const { message } = req.body;
  const userId = req.userId!;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  }

  const supabase = getSupabaseAdmin();

  // Verify user is a member of this team
  const { data: membership } = await supabase
    .from('submission_team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this team' });
  }

  // Check if chat is still active
  const { data: chatActive } = await supabase.rpc('is_team_chat_active', { p_team_id: teamId });

  if (!chatActive) {
    return res.status(403).json({ error: 'Team chat has expired after announcement round ended' });
  }

  const { data: chatMessage, error } = await supabase
    .from('team_chat_messages')
    .insert({
      team_id: teamId,
      sender_id: userId,
      message: message.trim(),
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ message: chatMessage });
});

export default router;
