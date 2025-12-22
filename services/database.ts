// Database service adapter that provides the same interface as demoDb but uses Supabase
import { supabase, organizations, programs as supabasePrograms, auth, submissions, judges, contacts, roles } from './supabase';
import { Program, Category, Round, Submission, Judge, Contact, Role } from './demoDb';

class DatabaseService {
  private currentOrgId: string | null = null;

  // Initialize and get current organization
  async initialize() {
    try {
      // First try to get existing organization
      const { data: org, error } = await organizations.getCurrent();
      if (org && org.id) {
        this.currentOrgId = org.id;
        return { org, error: null };
      }
      
      // If no org exists, try to create a default one for the user
      if (!org && !error) {
        const { user } = await auth.getUser();
        if (user) {
          // Try to create a default organization
          const email = user.email || 'user';
          const baseName = user.user_metadata?.full_name || email.split('@')[0] || 'My Organization';
          const orgName = baseName.trim() || 'My Organization';
          
          // Generate a unique slug
          let baseSlug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          if (!baseSlug) baseSlug = 'my-organization';
          
          // Add timestamp to make slug unique if needed
          const orgSlug = `${baseSlug}-${Date.now()}`;
          
          const { data: newOrg, error: createError } = await organizations.create(orgName, orgSlug);
          if (newOrg && !createError) {
            this.currentOrgId = newOrg.id;
            return { org: newOrg, error: null };
          } else if (createError) {
            // If creation failed due to conflict, try to get existing org
            console.warn('Organization creation failed, trying to get existing:', createError);
            const { data: existingOrg } = await organizations.getCurrent();
            if (existingOrg && existingOrg.id) {
              this.currentOrgId = existingOrg.id;
              return { org: existingOrg, error: null };
            }
          }
        }
      }
      
      return { org, error };
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return { org: null, error };
    }
  }

  getCurrentOrgId(): string | null {
    return this.currentOrgId;
  }

  // Refresh organization cache
  async refreshOrgCache() {
    this.currentOrgId = null;
    const { data: org } = await organizations.getCurrent();
    if (org?.id) {
      this.currentOrgId = org.id;
    }
  }

  // Convert Supabase program to demo format
  private mapProgram(program: any): Program {
    return {
      id: program.id,
      title: program.title,
      category: program.industry_category || 'General',
      type: (program.event_types?.name || 'Award') as Program['type'],
      status: this.mapStatus(program.status) as 'Active' | 'Draft' | 'Completed',
      deadline: program.deadline ? new Date(program.deadline).toISOString().split('T')[0] : '',
      entriesCount: program.entries_count || 0,
      paymentConfig: program.program_payment_configs ? {
        enabled: program.program_payment_configs.enabled || false,
        provider: program.program_payment_configs.provider || 'Stripe',
        currency: program.program_payment_configs.currency || 'USD',
        fee: Number(program.program_payment_configs.fee_amount) || 0,
        connected: program.program_payment_configs.connected || false,
      } : undefined,
      description: program.description,
      slug: program.slug,
      coverImageUrl: program.cover_image_url,
      visibility: program.visibility ? (program.visibility.charAt(0).toUpperCase() + program.visibility.slice(1)) as 'Public' | 'Private' : 'Public',
      timezone: program.timezone || 'UTC',
    };
  }

  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'draft': 'Draft',
      'completed': 'Completed',
    };
    return statusMap[status?.toLowerCase()] || 'Draft';
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    const { data, error } = await supabasePrograms.getAll();
    if (error || !data) return [];
    return data.map((p: any) => this.mapProgram(p));
  }

  async getProgramById(id: string): Promise<Program | undefined> {
    const { data, error } = await supabasePrograms.getById(id);
    if (error || !data) return undefined;
    return this.mapProgram(data);
  }

  async addProgram(program: Omit<Program, 'id' | 'entriesCount'>): Promise<Program> {
    // Ensure organization exists
    if (!this.currentOrgId) {
      await this.initialize();
    }
    
    // Look up event_type_id by name
    let eventTypeId: string | undefined = undefined;
    if (program.type && supabase) {
      const { data: eventTypes, error: eventTypeError } = await supabase
        .from('event_types')
        .select('id')
        .eq('name', program.type)
        .maybeSingle();
      
      if (!eventTypeError && eventTypes) {
        eventTypeId = eventTypes.id;
      }
    }

    const { data, error } = await supabasePrograms.create({
      title: program.title,
      description: program.description || '',
      industry_category: program.category,
      deadline: program.deadline || undefined,
      event_type_id: eventTypeId,
    });
    
    if (error) {
      const errorMessage = error?.message || 'Failed to create program';
      throw new Error(errorMessage);
    }
    
    if (!data) {
      throw new Error('Failed to create program: No data returned');
    }
    
    return this.mapProgram(data);
  }

  async updateProgram(program: Program) {
    const { data, error } = await supabasePrograms.update(program.id, {
      title: program.title,
      status: program.status.toLowerCase(),
      deadline: program.deadline || undefined,
      slug: program.slug,
      description: program.description,
      cover_image_url: program.coverImageUrl,
      industry_category: program.category,
      visibility: program.visibility?.toLowerCase(),
    });
    if (error) {
      const errorMessage = error?.message || 'Failed to update program';
      throw new Error(errorMessage);
    }
    if (!data) {
      throw new Error('Failed to update program: No data returned');
    }
    return this.mapProgram(data);
  }

  // Categories
  async getCategories(programId: string): Promise<Category[]> {
    const { data, error } = await supabasePrograms.getById(programId);
    if (error || !data?.categories) return [];

    return (data.categories || []).map((cat: any) => ({
      id: cat.id,
      title: cat.title,
      programId: cat.program_id,
      parentId: cat.parent_id,
      entriesCount: cat.entries_count || 0,
    }));
  }

  async addCategory(category: Omit<Category, 'id' | 'entriesCount'>): Promise<Category> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        program_id: category.programId,
        parent_id: category.parentId || null,
        title: category.title,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create category');

    return {
      id: data.id,
      title: data.title,
      programId: data.program_id,
      parentId: data.parent_id,
      entriesCount: data.entries_count || 0,
    };
  }

  // Rounds
  async getRounds(programId: string): Promise<Round[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('program_id', programId)
      .order('start_date');

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      programId: r.program_id,
      title: r.title,
      type: r.type as Round['type'],
      startDate: new Date(r.start_date).toISOString().split('T')[0],
      endDate: new Date(r.end_date).toISOString().split('T')[0],
      status: this.mapRoundStatus(r.status) as Round['status'],
      description: r.description,
    }));
  }

  private mapRoundStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'upcoming': 'Upcoming',
      'active': 'Active',
      'completed': 'Completed',
    };
    return statusMap[status?.toLowerCase()] || 'Upcoming';
  }

  async addRound(round: Omit<Round, 'id'>): Promise<Round> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('rounds')
      .insert({
        program_id: round.programId,
        title: round.title,
        type: round.type,
        start_date: round.startDate,
        end_date: round.endDate,
        status: round.status.toLowerCase(),
        description: round.description,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create round');

    return {
      id: data.id,
      programId: data.program_id,
      title: data.title,
      type: data.type as Round['type'],
      startDate: new Date(data.start_date).toISOString().split('T')[0],
      endDate: new Date(data.end_date).toISOString().split('T')[0],
      status: this.mapRoundStatus(data.status) as Round['status'],
      description: data.description,
    };
  }

  // Submissions
  async getSubmissions(programId?: string): Promise<Submission[]> {
    const filters = programId ? { programId } : undefined;
    const { data, error } = await submissions.getAll(filters);

    if (error || !data) return [];

    return data.map((s: any) => ({
      id: s.id,
      title: s.title || 'Untitled',
      applicant: s.applicant_name || s.applicant_email || 'Unknown',
      category: s.categories?.title || 'Uncategorized',
      status: this.mapSubmissionStatus(s.status) as Submission['status'],
      score: s.average_score ? Math.round(s.average_score) : null,
      date: s.submitted_at ? new Date(s.submitted_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      image: s.cover_image_url || `https://source.unsplash.com/random/50x50?${s.id}`,
      assignedJudges: s.submission_judges?.map((sj: any) => sj.judge_id) || [],
    }));
  }

  private mapSubmissionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'under_review': 'Under Review',
      'shortlisted': 'Shortlisted',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
    };
    return statusMap[status?.toLowerCase()] || 'Pending';
  }

  async addSubmission(submission: Omit<Submission, 'id' | 'date' | 'score' | 'image' | 'assignedJudges'>): Promise<Submission> {
    if (!supabase) throw new Error('Supabase not configured');

    // Need to find program and category IDs
    const programs = await this.getPrograms();
    const program = programs.find(p => p.title === submission.category || p.id);
    if (!program) throw new Error('Program not found');

    const categories = await this.getCategories(program.id);
    const category = categories.find(c => c.title === submission.category);

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        program_id: program.id,
        category_id: category?.id || null,
        title: submission.title,
        description: '',
        status: 'pending',
        applicant_name: submission.applicant,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create submission');

    return {
      id: data.id,
      title: data.title,
      applicant: data.applicant_name || 'Unknown',
      category: category?.title || 'Uncategorized',
      status: 'Pending',
      score: null,
      date: new Date().toISOString().split('T')[0],
      image: `https://source.unsplash.com/random/50x50?${data.id}`,
      assignedJudges: [],
    };
  }

  async bulkUpdateSubmissions(ids: string[], updates: Partial<Submission>) {
    if (!supabase) throw new Error('Supabase not configured');

    const statusMap: Record<string, string> = {
      'Pending': 'pending',
      'Under Review': 'under_review',
      'Shortlisted': 'shortlisted',
      'Accepted': 'accepted',
      'Rejected': 'rejected',
    };

    const supabaseUpdates: any = {};
    if (updates.status) {
      supabaseUpdates.status = statusMap[updates.status] || updates.status.toLowerCase();
    }

    const { error } = await supabase
      .from('submissions')
      .update(supabaseUpdates)
      .in('id', ids);

    if (error) throw new Error(error.message);
  }

  // Judges
  async getJudges(): Promise<Judge[]> {
    const { data, error } = await judges.getAll();
    if (error || !data) return [];

    return data.map((j: any) => ({
      id: j.id,
      name: j.name,
      avatar: j.avatar_url || `https://i.pravatar.cc/150?u=${j.id}`,
      email: j.email,
      status: this.mapJudgeStatus(j.status) as Judge['status'],
      progress: j.completed_count && j.assigned_count
        ? Math.round((j.completed_count / j.assigned_count) * 100)
        : 0,
      assignedCount: j.assigned_count || 0,
      completedCount: j.completed_count || 0,
    }));
  }

  private mapJudgeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'invited': 'Invited',
      'completed': 'Completed',
    };
    return statusMap[status?.toLowerCase()] || 'Invited';
  }

  // Contacts/CRM
  async getContacts(): Promise<Contact[]> {
    const { data, error } = await contacts.getAll();
    if (error || !data) return [];

    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: 'User', // Would need to join with organization_members to get role
      status: c.status === 'active' ? 'Active' : 'Inactive',
      lastActive: c.last_active_at ? new Date(c.last_active_at).toLocaleDateString() : 'Never',
      avatar: c.avatar_url || `https://i.pravatar.cc/150?u=${c.id}`,
      source: c.source || 'Unknown',
      surveyAnswer: c.survey_answer || '',
      joinedDate: c.joined_at ? new Date(c.joined_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }));
  }

  async addContact(contact: Omit<Contact, 'id' | 'lastActive' | 'joinedDate' | 'avatar'>): Promise<Contact> {
    const { data, error } = await contacts.create({
      name: contact.name,
      email: contact.email,
      source: contact.source,
    });

    if (error || !data) throw new Error(error?.message || 'Failed to create contact');

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: contact.role,
      status: 'Active',
      lastActive: 'Never',
      avatar: data.avatar_url || `https://i.pravatar.cc/150?u=${data.id}`,
      source: data.source || contact.source,
      surveyAnswer: '',
      joinedDate: new Date().toISOString().split('T')[0],
    };
  }

  // Roles
  async getRoles(): Promise<Role[]> {
    const { data, error } = await roles.getAll();
    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      permissions: r.role_permissions?.map((rp: any) => rp.permissions?.key) || [],
      usersCount: 0, // Would need to count organization_members
      color: r.color || 'bg-slate-100 text-slate-700',
    }));
  }

  // Stats
  async getStats(programId?: string) {
    const submissions = await this.getSubmissions(programId);
    const programs = await this.getPrograms();

    const relevantSubmissions = programId
      ? submissions.filter(s => {
        // Would need to track which program each submission belongs to
        return true; // Simplified for now
      })
      : submissions;

    const activePrograms = programs.filter(p => p.status === 'Active');

    return {
      totalSubmissions: relevantSubmissions.length,
      activePrograms: activePrograms.length,
      pendingReview: relevantSubmissions.filter(s =>
        s.status === 'Pending' || s.status === 'Under Review'
      ).length,
      revenue: relevantSubmissions.length * 45, // Mock calculation
    };
  }

  // Current User (from auth)
  async getCurrentUser(): Promise<Contact | null> {
    const { user } = await auth.getUser();
    if (!user) return null;

    if (!supabase) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      name: profile.full_name || user.email || 'User',
      email: user.email || '',
      role: 'Admin', // Default, would need to check organization_members
      status: 'Active',
      lastActive: 'Now',
      avatar: profile.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`,
      source: 'Internal',
      surveyAnswer: '',
      joinedDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    };
  }

  hasPermission(permission: string): boolean {
    // Simplified - would need to check user's role and permissions
    return true; // For now, allow all
  }
}

export const db = new DatabaseService();

