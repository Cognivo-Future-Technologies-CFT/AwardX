import { fetchBackendJson } from './backendApi';
import { getSupabaseClient } from './supabaseClient';

export interface AdminSystemUser {
  id: string;
  full_name: string | null;
  email: string | null;
  is_super_admin: boolean;
  created_at: string;
  organizations?: { organization: { name: string } }[];
  super_admin_granted_at?: string;
  granted_by_user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface ApiKey {
  id: string;
  provider: string;
  is_active: boolean;
  updated_at: string;
  updated_by: {
    full_name: string | null;
  } | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
  user_name: string | null;
  user_avatar: string | null;
  created_at: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}

export const adminService = {
  async searchUsers(query: string): Promise<AdminSystemUser[]> {
    if (!query.trim()) return [];
    return fetchBackendJson<AdminSystemUser[]>(`/api/admin/users/search?q=${encodeURIComponent(query)}`, { requireAuth: true });
  },

  async getSuperAdmins(): Promise<AdminSystemUser[]> {
    return fetchBackendJson<AdminSystemUser[]>('/api/admin/super-admins', { requireAuth: true });
  },

  async grantSuperAdmin(userId: string): Promise<void> {
    await fetchBackendJson(`/api/admin/users/${userId}/grant-super-admin`, { method: 'PUT', requireAuth: true });
  },

  async revokeSuperAdmin(userId: string): Promise<void> {
    await fetchBackendJson(`/api/admin/users/${userId}/revoke-super-admin`, { method: 'DELETE', requireAuth: true });
  },

  async getApiKeys(): Promise<ApiKey[]> {
    return fetchBackendJson<ApiKey[]>('/api/admin/api-keys', { requireAuth: true });
  },

  async updateApiKey(provider: string, apiKey: string, isActive: boolean = true): Promise<{ success: boolean; data: any }> {
    return fetchBackendJson('/api/admin/api-keys', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({ provider, apiKey, isActive })
    });
  },

  async getAuditLogs(page: number = 1, limit: number = 50, actionType?: string, search?: string): Promise<AuditLogsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    if (actionType) params.append('action_type', actionType);
    if (search) params.append('search', search);

    return fetchBackendJson<AuditLogsResponse>(`/api/admin/audit-logs?${params.toString()}`, { requireAuth: true });
  },

  async getDashboardStats() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const [usersRes, orgsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*', { count: 'exact', head: true })
    ]);

    return {
      totalUsers: usersRes.count || 0,
      activeOrganizations: orgsRes.count || 0,
      platformRevenue: 0, // Placeholder, can be updated later when revenue tracking is implemented
    };
  },

  async getAnalyticsStats() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const [programsRes, submissionsRes, roundsRes, certificatesRes] = await Promise.all([
      supabase.from('programs').select('*', { count: 'exact', head: true }),
      supabase.from('submissions').select('*', { count: 'exact', head: true }),
      supabase.from('rounds').select('*', { count: 'exact', head: true }),
      supabase.from('certificates').select('*', { count: 'exact', head: true })
    ]);

    return {
      totalPrograms: programsRes.count || 0,
      totalSubmissions: submissionsRes.count || 0,
      totalRounds: roundsRes.count || 0,
      totalCertificates: certificatesRes.count || 0,
    };
  },

  async getSuperAdminAnalytics(timeframe: string = '30d') {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const [
      profilesRes,
      orgsRes,
      programsRes,
      submissionsRes,
      certificatesRes,
      categoriesRes
    ] = await Promise.all([
      supabase.from('profiles').select('id, created_at, full_name'),
      supabase.from('organizations').select('id, name, created_at, plan'),
      supabase.from('programs').select('id, created_at, industry_category, status, title'),
      supabase.from('submissions').select('id, submitted_at, status'),
      supabase.from('certificates').select('id, issued_at'),
      supabase.from('categories').select('id')
    ]);

    const users = profilesRes.data || [];
    const orgs = orgsRes.data || [];
    const programs = programsRes.data || [];
    const submissions = submissionsRes.data || [];
    const certificates = certificatesRes.data || [];
    const categoriesCount = categoriesRes.data?.length || 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterDate = (() => {
      const d = new Date();
      switch (timeframe) {
        case '7d': d.setDate(d.getDate() - 7); break;
        case '30d': d.setDate(d.getDate() - 30); break;
        case '90d': d.setDate(d.getDate() - 90); break;
        case '1y': d.setFullYear(d.getFullYear() - 1); break;
        case 'all': return new Date(0);
        default: d.setDate(d.getDate() - 30); break;
      }
      return d;
    })();

    const createdAfter = (items: any[], date: Date, dateField = 'created_at') => 
      items.filter(i => i[dateField] && new Date(i[dateField]) >= date);

    // Apply filtering for charts (totals remain all-time)
    const filteredPrograms = createdAfter(programs, filterDate);
    const filteredSubmissions = createdAfter(submissions, filterDate, 'submitted_at');

    const kpis = {
      totalUsers: users.length,
      activeUsers30d: createdAfter(users, thirtyDaysAgo).length,
      totalOrgs: orgs.length,
      newOrgs30d: createdAfter(orgs, thirtyDaysAgo).length,
      totalPrograms: programs.length,
      activePrograms: programs.filter(p => p.status === 'Active' || p.status === 'Published').length,
      totalCategories: categoriesCount,
      totalSubmissions: submissions.length,
      pendingSubmissions: submissions.filter(s => s.status === 'Pending' || s.status === 'Under Review').length,
      completedPrograms: programs.filter(p => p.status === 'Completed').length,
      totalCertificates: certificates.length,
    };

    const categoryCounts: Record<string, number> = {};
    filteredPrograms.forEach(p => {
      const cat = p.industry_category || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const programsByCategory = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const statusCounts: Record<string, number> = {};
    filteredSubmissions.forEach(s => {
      const st = s.status || 'Unknown';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });
    const submissionsByStatus = Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }));

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const growthData = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        name: monthNames[d.getMonth()],
        users: Math.floor(Math.random() * 50) + 10,
        orgs: Math.floor(Math.random() * 20) + 5,
        submissions: Math.floor(Math.random() * 100) + 20
      };
    });

    const activities: any[] = [];
    orgs.forEach(o => {
      if (o.created_at) {
        activities.push({ id: `org-${o.id}`, type: 'org', text: `${o.name || 'A new organization'} was created`, time: new Date(o.created_at).getTime() });
      }
    });
    programs.forEach(p => {
      if (p.created_at) {
        activities.push({ id: `prog-${p.id}`, type: 'program', text: `Program "${p.title || 'Untitled'}" was published`, time: new Date(p.created_at).getTime() });
      }
    });
    users.forEach(u => {
      if (u.created_at) {
        activities.push({ id: `user-${u.id}`, type: 'user', text: `${u.full_name || 'A new user'} joined the platform`, time: new Date(u.created_at).getTime() });
      }
    });

    const recentActivity = activities
      .sort((a, b) => b.time - a.time)
      .slice(0, 100);

    return {
      kpis,
      charts: {
        programsByCategory,
        submissionsByStatus,
        growthData
      },
      recentOrgs: orgs,
      recentActivity
    };
  }
};
