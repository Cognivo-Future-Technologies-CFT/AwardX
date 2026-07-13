import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';
import { encryptValue, decryptValue } from '../utils/crypto.js';
import { logAuditAction } from '../utils/audit.js';
import { Resend } from 'resend';
import { resolveEmailSiteUrl } from '../lib/emailSiteUrl.js';

const router = Router();

// Middleware to verify that the requester is a Super Admin
async function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', req.userId)
      .single();
    
    if (error || !data?.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
    
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
}

router.use(requireAuth);
router.use(requireSuperAdmin);


// GET /admin/users/search?q=
router.get('/users/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q.trim()) {
      return res.json([]);
    }
    
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        is_super_admin,
        created_at,
        organizations:organization_members!user_id(organization:organizations(name))
      `);
      
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    
    if (isUuid) {
      query = query.eq('id', q);
    } else {
      const { data: matchedIds } = await supabase.rpc('search_users_by_email', { search_term: q });
      const ids = matchedIds?.map((m: any) => m.id) || [];
      
      if (ids.length > 0) {
        query = query.or(`full_name.ilike.%${q}%,id.in.(${ids.join(',')})`);
      } else {
        query = query.or(`full_name.ilike.%${q}%`);
      }
    }

    const { data, error } = await query.limit(20);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.json([]);
    }

    const userIds = data.map((u: any) => u.id);
    const { data: emailsData } = await supabase.rpc('get_user_emails', { user_ids: userIds });
    
    const emailMap = new Map(emailsData?.map((e: any) => [e.id, e.email]) || []);
    
    const dataWithEmails = data.map((u: any) => ({
      ...u,
      email: emailMap.get(u.id) || null
    }));

    res.json(dataWithEmails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/super-admins
router.get('/super-admins', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        is_super_admin,
        created_at
      `)
      .eq('is_super_admin', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.json([]);
    }

    // Collect all user IDs to fetch emails and audit logs
    const userIds = new Set<string>();
    data.forEach((u: any) => {
      userIds.add(u.id);
    });

    const userIdsArray = Array.from(userIds);

    const [emailsResponse, auditLogsResponse] = await Promise.all([
      supabase.rpc('get_user_emails', { user_ids: userIdsArray }),
      supabase.from('audit_logs')
        .select('resource_id, created_at')
        .eq('action_type', 'SUPER_ADMIN')
        .in('resource_id', userIdsArray)
        .order('created_at', { ascending: false })
    ]);
    
    const emailMap = new Map(emailsResponse.data?.map((e: any) => [e.id, e.email]) || []);
    
    // Map resource_id to the most recent grant date
    const grantDateMap = new Map();
    auditLogsResponse.data?.forEach((log: any) => {
      if (!grantDateMap.has(log.resource_id)) {
        grantDateMap.set(log.resource_id, log.created_at);
      }
    });
    
    const dataWithExtras = data.map((u: any) => ({
      ...u,
      email: emailMap.get(u.id) || null,
      super_admin_granted_at: grantDateMap.get(u.id) || null
    }));

    res.json(dataWithExtras);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/users/:userId/grant-super-admin
router.put('/users/:userId/grant-super-admin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const actorId = req.userId as string;
    const supabase = getSupabaseAdmin();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_super_admin: true })
      .eq('id', userId);

    if (updateError) throw updateError;
    
    await logAuditAction(actorId, `Granted Super Admin Access to user ${userId}`, 'SUPER_ADMIN', 'USER', userId, 'Action: Grant');

    // Fetch the user's email to notify them
    const { data: emailsData } = await supabase.rpc('get_user_emails', { user_ids: [userId] });
    const userEmail = emailsData?.[0]?.email;

    if (userEmail && process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: userEmail,
        subject: 'Super Admin Access Granted - AwardX',
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">Super Admin Access Granted</h2>
            <p>Hello,</p>
            <p>You have been granted <strong>Super Admin</strong> privileges on AwardX.</p>
            <p>You now have full access to manage the entire platform, including organizations, billing, programs, API keys, and system settings.</p>
            <p>Please use these privileges responsibly.</p>
            <div style="margin: 30px 0;">
              <a href="${resolveEmailSiteUrl()}/admin" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Admin Dashboard</a>
            </div>
            <p>Best regards,<br/>The AwardX System</p>
          </div>
        `
      }).catch(err => console.error('Failed to send super admin grant email:', err));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/users/:userId/revoke-super-admin
router.delete('/users/:userId/revoke-super-admin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const actorId = req.userId as string;
    
    if (userId === actorId) {
      return res.status(400).json({ error: 'You cannot revoke your own Super Admin access.' });
    }

    const supabase = getSupabaseAdmin();

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_super_admin', true);
      
    if (countError) throw countError;
    if (count === null || count <= 1) {
      return res.status(400).json({ error: 'At least one Super Admin must remain in the system.' });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_super_admin: false })
      .eq('id', userId);

    if (updateError) throw updateError;

    await logAuditAction(actorId, `Revoked Super Admin Access from user ${userId}`, 'SUPER_ADMIN', 'USER', userId, 'Action: Revoke');

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API KEYS MANAGEMENT

// GET /admin/api-keys
router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('system_api_keys')
      .select('id, provider, is_active, updated_at, updated_by(full_name)');
      
    if (error) throw error;
    
    // We do NOT return the encrypted api_key directly here to the frontend
    // The frontend only needs to know if the key exists and when it was updated
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/api-keys
router.post('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actorId = req.userId as string;
    const { provider, apiKey, isActive } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API Key are required' });
    }
    
    const encryptedKey = encryptValue(apiKey);
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('system_api_keys')
      .upsert({
        provider,
        api_key_encrypted: encryptedKey,
        is_active: isActive !== undefined ? isActive : true,
        updated_at: new Date().toISOString(),
        updated_by: actorId
      }, { onConflict: 'provider' })
      .select('id, provider, is_active, updated_at')
      .single();
      
    if (error) throw error;
    
    await logAuditAction(actorId, `Updated ${provider} API Key`, 'API_KEY', 'SYSTEM_SETTING', data.id, `Provider: ${provider}`);

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AUDIT LOGS

// GET /admin/audit-logs
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page = 1, limit = 50, action_type, search } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });
      
    if (action_type) {
      query = query.eq('action_type', action_type);
    }
    
    if (search) {
      query = query.or(`action.ilike.%${search}%,user_name.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);
      
    if (error) throw error;
    
    res.json({
      data,
      metadata: {
        total: count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
