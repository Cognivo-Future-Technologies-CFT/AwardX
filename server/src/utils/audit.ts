import { getSupabaseAdmin } from '../supabase.js';

export async function logAuditAction(
  userId: string,
  action: string,
  actionType: string,
  resourceType: string,
  resourceId?: string,
  details?: string
) {
  try {
    const supabase = getSupabaseAdmin();
    // Fetch actor name for denormalization
    const { data: actor } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();
    
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      user_name: actor?.full_name || 'System User',
      user_avatar: actor?.avatar_url
    });
  } catch (err) {
    console.error('Failed to insert audit log:', err);
  }
}
