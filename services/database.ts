// Database service adapter that provides a convenient UI-facing API on top of Supabase.
import {
  supabase,
  organizations,
  programs as supabasePrograms,
  auth,
  submissions,
  judges,
  roles,
  auditLogs,
  socialAccounts,
  scheduledPosts,
  team,
  settings,
  forms,
  roundSubmissions,
  votingConfigs,
  advancement,
  resolveMediaPublicUrl,
} from './supabase';
import { getCurrentOrgId, getCurrentUserId } from './supabase';
import { Program, Category, Round, Submission, Judge, Role, Log, SocialAccount, ScheduledPost, TeamMember } from './models';
import { PageConfig, PageSection, Sponsor, FAQ, TimelineMilestone } from '../types/overviewPage';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  token: string;
  roleId: string | null;
  roleName: string | null;
  programId: string | null;
  createdAt: string;
}

export interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  programId: string | null;
  createdAt: string;
}

export interface MySubmissionPortalItem {
  id: string;
  title: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  programTitle: string;
  paymentStatus: string;
  paymentAmount: number;
  formId: string | null;
  feedbackItems: Array<{
    judgeName: string;
    recommendation: string | null;
    overallComment: string | null;
    scoredCriteriaCount: number;
  }>;
  feedbackCount: number;
  canWithdraw: boolean;
}

export interface ApplicantDraftItem {
  id: string;
  formId: string;
  formTitle: string;
  programTitle: string;
  currentPage: number;
  updatedAt: string;
  fieldCount: number;
}

export interface ApplicantPortalData {
  submissions: MySubmissionPortalItem[];
  drafts: ApplicantDraftItem[];
}

// --- Event Overview Page Service ---
export const programPages = {
  // Config
  async getConfig(programId: string) {
    const { data, error } = await supabase
      .from('program_page_configs')
      .select('*')
      .eq('program_id', programId)
      .maybeSingle();

    // Return default empty config if none exists, or null
    return { data, error };
  },

  async createOrUpdateConfig(programId: string, config: Partial<PageConfig>) {
    // Check if exists first (or rely on upsert if ID is known/stable)
    // Here we'll upsert based on program_id uniqueness
    const { data, error } = await supabase
      .from('program_page_configs')
      .upsert({
        program_id: programId,
        theme_settings: config.themeSettings,
        is_published: config.isPublished,
        seo_title: config.seoTitle,
        seo_description: config.seoDescription,
        updated_at: new Date().toISOString()
      }, { onConflict: 'program_id' })
      .select()
      .single();

    return { data, error };
  },

  // Sections
  async getSections(programId: string) {
    const { data, error } = await supabase
      .from('program_page_sections')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  async saveSection(section: Partial<PageSection>) {
    // If ID starts with 'temp-', remove it to let DB generate one
    const id = section.id?.startsWith('temp-') ? undefined : section.id;

    const { data, error } = await supabase
      .from('program_page_sections')
      .upsert({
        id,
        program_id: section.programId,
        section_type: section.sectionType,
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        settings: section.settings,
        sort_order: section.sortOrder,
        is_visible: section.isVisible,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    return { data, error };
  },

  async deleteSection(id: string) {
    return await supabase.from('program_page_sections').delete().eq('id', id);
  },

  // Sponsors
  async getSponsors(programId: string) {
    const { data, error } = await supabase
      .from('program_sponsors')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  async saveSponsor(sponsor: Partial<Sponsor>) {
    const id = sponsor.id?.startsWith('temp-') ? undefined : sponsor.id;

    const { data, error } = await supabase
      .from('program_sponsors')
      .upsert({
        id,
        program_id: sponsor.programId,
        name: sponsor.name,
        logo_url: sponsor.logoUrl,
        website_url: sponsor.websiteUrl,
        tier: sponsor.tier,
        tier_label: sponsor.tierLabel,
        sort_order: sponsor.sortOrder,
        is_active: sponsor.isActive
      })
      .select()
      .single();
    return { data, error };
  },

  async deleteSponsor(id: string) {
    return await supabase.from('program_sponsors').delete().eq('id', id);
  },

  // FAQs
  async getFAQs(programId: string) {
    const { data, error } = await supabase
      .from('program_faqs')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  async saveFAQ(faq: Partial<FAQ>) {
    const id = faq.id?.startsWith('temp-') ? undefined : faq.id;

    const { data, error } = await supabase
      .from('program_faqs')
      .upsert({
        id,
        program_id: faq.programId,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sort_order: faq.sortOrder,
        is_visible: faq.isVisible
      })
      .select()
      .single();
    return { data, error };
  },

  async deleteFAQ(id: string) {
    return await supabase.from('program_faqs').delete().eq('id', id);
  },

  // Timeline Milestones
  async getTimeline(programId: string) {
    const { data, error } = await supabase
      .from('program_timeline_milestones')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  async saveMilestone(milestone: Partial<TimelineMilestone>) {
    const id = milestone.id?.startsWith('temp-') ? undefined : milestone.id;

    const { data, error } = await supabase
      .from('program_timeline_milestones')
      .upsert({
        id,
        program_id: milestone.programId,
        title: milestone.title,
        date: milestone.date,
        description: milestone.description,
        icon: milestone.icon,
        sort_order: milestone.sortOrder,
        is_visible: milestone.isVisible
      })
      .select()
      .single();
    return { data, error };
  },

  async deleteMilestone(id: string) {
    return await supabase.from('program_timeline_milestones').delete().eq('id', id);
  }
};

// --- Workspace State Service ---
export const workspaceState = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('user_workspace_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return { data, error };
  },

  async save(userId: string, state: {
    active_program_id?: string | null;
    current_view?: string;
    sidebar_collapsed?: boolean;
    selected_form_ids?: Record<string, string>;
    preferences?: Record<string, any>;
  }) {
    const { data, error } = await supabase
      .from('user_workspace_state')
      .upsert({
        user_id: userId,
        ...state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();
    return { data, error };
  },
};

// --- Submission Drafts Service ---
export const submissionDrafts = {
  async get(formId: string, userId?: string, sessionId?: string) {
    let query = supabase
      .from('submission_drafts')
      .select('*')
      .eq('form_id', formId);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query.maybeSingle();
    return { data, error };
  },

  async save(draft: {
    form_id: string;
    user_id?: string;
    session_id?: string;
    draft_data: Record<string, any>;
    current_page: number;
  }) {
    const { data, error } = await supabase
      .from('submission_drafts')
      .upsert({
        ...draft,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data, error };
  },

  async delete(formId: string, userId?: string) {
    let query = supabase
      .from('submission_drafts')
      .delete()
      .eq('form_id', formId);
    if (userId) query = query.eq('user_id', userId);
    return await query;
  },
};

// --- Judging Config Service ---
export const judgingConfig = {
  async get(programId: string) {
    const { data, error } = await supabase
      .from('judging_config')
      .select('*')
      .eq('program_id', programId)
      .maybeSingle();
    return { data, error };
  },

  async save(programId: string, config: {
    scoring_system?: string;
    pass_threshold?: number;
    blind_judging?: boolean;
    allow_comments?: boolean;
    auto_assign?: boolean;
    max_judges_per_submission?: number;
  }) {
    const { data, error } = await supabase
      .from('judging_config')
      .upsert({
        program_id: programId,
        ...config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'program_id' })
      .select()
      .single();
    return { data, error };
  },
};

// --- Slug History Service ---
export const slugHistory = {
  async getByOldSlug(slug: string) {
    const { data, error } = await supabase
      .from('slug_history')
      .select('*')
      .eq('old_slug', slug)
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return { data, error };
  },
};

// --- Form Analytics Service ---
export const formAnalytics = {
  async track(event: {
    form_id: string;
    event_type: 'view' | 'start' | 'complete' | 'abandon';
    user_id?: string;
    session_id?: string;
    page_reached?: number;
    metadata?: Record<string, any>;
  }) {
    const { data, error } = await supabase
      .from('form_analytics')
      .insert(event)
      .select()
      .single();
    return { data, error };
  },

  async getStats(formId: string) {
    const { data, error } = await supabase
      .from('form_analytics')
      .select('event_type')
      .eq('form_id', formId);

    if (error || !data) return { data: null, error };

    const views = data.filter(e => e.event_type === 'view').length;
    const starts = data.filter(e => e.event_type === 'start').length;
    const completes = data.filter(e => e.event_type === 'complete').length;
    const abandons = data.filter(e => e.event_type === 'abandon').length;

    return {
      data: {
        views,
        starts,
        completes,
        abandons,
        completionRate: starts > 0 ? Math.round((completes / starts) * 100) : 0,
      },
      error: null,
    };
  },
};

class DatabaseService {
  private currentOrgId: string | null = null;
  private currentProgramId: string | null = null;
  private cachedPermissions: Set<string> | null = null;
  private cachedRoleName: string | null = null;

  private async safeAuditLog(event: {
    action: string;
    actionType: 'create' | 'update' | 'delete' | 'warning' | 'access';
    resourceType?: string;
    resourceId?: string;
    details?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await auditLogs.logEvent({
        action: event.action,
        actionType: event.actionType,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        details: event.details,
        metadata: event.metadata,
      });
    } catch (e) {
      // Don't break primary flows if audit logging fails, but surface it.
      console.warn('Audit log failed:', e);
    }
  }

  // Initialize and get current organization
  async initialize() {
    try {
      // First try to get existing organization
      const { data: org, error } = await organizations.getCurrent();
      if (org && org.id) {
        this.currentOrgId = org.id;
        await this.refreshPermissionCache();
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
    await this.refreshPermissionCache();
  }

  async setActiveProgram(programId: string | null) {
    this.currentProgramId = programId;
    await this.refreshPermissionCache();
  }

  private async refreshPermissionCache() {
    this.cachedPermissions = null;
    this.cachedRoleName = null;
    if (!supabase) return;

    const { user } = await auth.getUser();
    if (!user) return;

    if (!this.currentOrgId) {
      const { data: org } = await organizations.getCurrent();
      if (org?.id) this.currentOrgId = org.id;
    }
    if (!this.currentOrgId) return;

    // Find membership
    let memberQuery = supabase
      .from('organization_members')
      .select('role_id')
      .eq('organization_id', this.currentOrgId)
      .eq('user_id', user.id);
    if (this.currentProgramId) {
      memberQuery = memberQuery.eq('program_id', this.currentProgramId);
    }
    const { data: member } = await memberQuery.maybeSingle();

    if (!member?.role_id) return;

    // Fetch role permissions keys
    const { data: roleRow } = await supabase
      .from('roles')
      .select('id, name, role_permissions(permission_id, permissions(key))')
      .eq('id', member.role_id)
      .maybeSingle();

    const permKeys: string[] =
      (roleRow as any)?.role_permissions?.map((rp: any) => rp?.permissions?.key).filter(Boolean) || [];

    this.cachedRoleName = (roleRow as any)?.name || null;
    this.cachedPermissions = new Set(permKeys);
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
        provider: (() => {
          const p = String(program.program_payment_configs.provider || 'stripe').toLowerCase();
          if (p === 'paypal') return 'PayPal';
          if (p === 'razorpay') return 'Razorpay';
          return 'Stripe';
        })(),
        currency: program.program_payment_configs.currency || 'USD',
        fee: Number(program.program_payment_configs.fee_amount) || 0,
        connected: program.program_payment_configs.connected || false,
        publicKey: program.program_payment_configs.public_key || undefined,
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

  async addProgram(program: Omit<Program, 'id' | 'entriesCount'>, options?: { autoCreateRounds?: boolean }): Promise<Program> {
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

    const created = this.mapProgram(data);
    await this.safeAuditLog({
      action: 'Created program',
      actionType: 'create',
      resourceType: 'program',
      resourceId: created.id,
      details: created.title,
      metadata: { title: created.title },
    });

    // Auto-create default rounds from database template (default: true)
    const shouldAutoCreate = options?.autoCreateRounds !== false;
    if (shouldAutoCreate && eventTypeId && created.deadline && supabase) {
      try {
        // Query program_templates table for default rounds
        const { data: template, error: templateError } = await supabase
          .from('program_templates')
          .select('default_rounds, default_criteria')
          .eq('event_type_id', eventTypeId)
          .eq('is_active', true)
          .maybeSingle();

        if (!templateError && template?.default_rounds) {
          const roundTemplates = template.default_rounds as Array<{
            title: string;
            type: string;
            description: string;
            startOffsetDays: number;
            durationDays: number;
            reviewerCount?: number;
          }>;

          const deadlineDate = new Date(created.deadline);

          // Create rounds from template
          for (const roundTemplate of roundTemplates) {
            const startDate = new Date(deadlineDate);
            startDate.setDate(startDate.getDate() + roundTemplate.startOffsetDays);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + roundTemplate.durationDays);

            // Determine status based on current date
            const now = new Date();
            let status: 'Upcoming' | 'Active' | 'Completed';
            if (now < startDate) {
              status = 'Upcoming';
            } else if (now >= startDate && now <= endDate) {
              status = 'Active';
            } else {
              status = 'Completed';
            }

            const round: Omit<Round, 'id'> = {
              programId: created.id,
              title: roundTemplate.title,
              type: roundTemplate.type as Round['type'],
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              status,
              description: roundTemplate.description,
            };

            await this.addRound(round);
          }

          await this.safeAuditLog({
            action: 'Auto-created default rounds',
            actionType: 'create',
            resourceType: 'round',
            resourceId: created.id,
            details: `Created ${roundTemplates.length} default rounds for ${created.type} template`,
            metadata: { programId: created.id, roundCount: roundTemplates.length, template: created.type },
          });
        }
      } catch (roundError) {
        // Log error but don't fail program creation if round creation fails
        console.error('Failed to auto-create rounds:', roundError);
        await this.safeAuditLog({
          action: 'Failed to auto-create rounds',
          actionType: 'warning',
          resourceType: 'round',
          resourceId: created.id,
          details: roundError instanceof Error ? roundError.message : 'Unknown error',
        });
      }
    }

    return created;
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

    // Upsert payment config if provided
    if (supabase && program.paymentConfig) {
      const pc = program.paymentConfig;
      const { error: pcError } = await supabase
        .from('program_payment_configs')
        .upsert({
          program_id: program.id,
          enabled: !!pc.enabled,
          provider: (pc.provider || 'Stripe').toLowerCase(),
          currency: pc.currency || 'USD',
          fee_amount: Number(pc.fee) || 0,
          public_key: pc.publicKey || null,
          connected: !!pc.connected,
        }, { onConflict: 'program_id' });
      if (pcError) {
        throw new Error(pcError.message || 'Failed to update payment configuration');
      }
    }

    const updated = this.mapProgram(data);
    await this.safeAuditLog({
      action: 'Updated program',
      actionType: 'update',
      resourceType: 'program',
      resourceId: updated.id,
      details: updated.title,
      metadata: { title: updated.title },
    });
    return updated;
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

  async deleteCategory(categoryId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw new Error(error.message || 'Failed to delete category');

    await this.safeAuditLog({
      action: 'Deleted category',
      actionType: 'delete',
      resourceType: 'category',
      resourceId: categoryId,
      details: `Category ${categoryId} deleted`,
      metadata: { categoryId },
    });
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

    const created = {
      id: data.id,
      title: data.title,
      programId: data.program_id,
      parentId: data.parent_id,
      entriesCount: data.entries_count || 0,
    };
    await this.safeAuditLog({
      action: 'Created category',
      actionType: 'create',
      resourceType: 'category',
      resourceId: created.id,
      details: created.title,
      metadata: { title: created.title, programId: created.programId, parentId: created.parentId },
    });
    return created;
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

    const created = {
      id: data.id,
      programId: data.program_id,
      title: data.title,
      type: data.type as Round['type'],
      startDate: new Date(data.start_date).toISOString().split('T')[0],
      endDate: new Date(data.end_date).toISOString().split('T')[0],
      status: this.mapRoundStatus(data.status) as Round['status'],
      description: data.description,
    };
    await this.safeAuditLog({
      action: 'Created round',
      actionType: 'create',
      resourceType: 'round',
      resourceId: created.id,
      details: created.title,
      metadata: { title: created.title, programId: created.programId, type: created.type },
    });
    return created;
  }

  // Submissions
  async getSubmissions(programId?: string): Promise<Submission[]> {
    const filters = programId ? { programId } : undefined;
    const { data, error } = await submissions.getAll(filters);

    if (error || !data) return [];

    return data.map((s: any) => this.mapSubmission(s));
  }

  async getSubmissionsPaginated(options?: {
    programId?: string;
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResult<Submission>> {
    if (!supabase) {
      return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
    }

    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, Math.min(100, options?.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    const { data: orgPrograms } = await supabase
      .from('programs')
      .select('id')
      .eq('organization_id', orgId);

    const programIds = (orgPrograms || []).map((p: any) => p.id);
    if (programIds.length === 0) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    let query = supabase
      .from('submissions')
      .select(
        `
        *,
        categories(title),
        submission_judges(judge_id)
      `,
        { count: 'exact' }
      )
      .in('program_id', programIds)
      .order('submitted_at', { ascending: false });

    if (options?.programId) {
      if (!programIds.includes(options.programId)) {
        return { items: [], total: 0, page, pageSize, hasMore: false };
      }
      query = query.eq('program_id', options.programId);
    }

    const search = options?.search?.trim();
    if (search) {
      query = query.or(`title.ilike.%${search}%,applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1);
    if (error || !data) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    const items = data.map((s: any) => this.mapSubmission(s));
    const total = count || 0;

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + items.length < total,
    };
  }

  async getPublicSubmissions(programId: string): Promise<Submission[]> {
    const { data, error } = await submissions.getPublic(programId);
    if (error || !data) return [];
    return data.map((s: any) => this.mapSubmission(s));
  }

  async getMySubmissions(): Promise<MySubmissionPortalItem[]> {
    const portalData = await this.getMySubmissionPortalData();
    return portalData.submissions;
  }

  private async getAuthenticatedHeaders() {
    const { session } = await auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  async getMySubmissionPortalData(): Promise<ApplicantPortalData> {
    const headers = await this.getAuthenticatedHeaders();
    const response = await fetch('/api/submissions/my', {
      method: 'GET',
      headers,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to load applicant portal data');
    }

    return {
      submissions: payload?.submissions || [],
      drafts: payload?.drafts || [],
    };
  }

  async withdrawMySubmission(submissionId: string, reason?: string): Promise<void> {
    const headers = await this.getAuthenticatedHeaders();
    const response = await fetch('/api/submissions/withdraw', {
      method: 'POST',
      headers,
      body: JSON.stringify({ submissionId, reason }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to withdraw submission');
    }
  }

  async vote(submissionId: string) {
    const { data, error } = await submissions.vote(submissionId);
    if (error) throw new Error(error.message || 'Failed to cast vote');

    await this.safeAuditLog({
      action: 'Cast public vote',
      actionType: 'update',
      resourceType: 'submission',
      resourceId: submissionId,
      details: 'Public vote cast',
    });

    return data;
  }

  private mapSubmission(s: any): Submission {
    return {
      id: s.id,
      title: s.title || 'Untitled',
      applicant: s.applicant_name || s.applicant_email || 'Unknown',
      category: s.categories?.title || 'Uncategorized',
      status: this.mapSubmissionStatus(s.status) as Submission['status'],
      score: s.average_score ? Math.round(s.average_score) : null,
      date: s.submitted_at ? new Date(s.submitted_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      image: s.cover_image_url || `https://source.unsplash.com/random/50x50?${s.id}`,
      assignedJudges: s.submission_judges?.map((sj: any) => sj.judge_id) || [],
      votes: s.votes_count || s.submission_data?.votes || 0,
      submissionData: s.submission_data || {},
    };
  }


  private mapSubmissionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'under_review': 'Under Review',
      'shortlisted': 'Shortlisted',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
      'withdrawn': 'Withdrawn',
    };
    return statusMap[status?.toLowerCase()] || 'Pending';
  }

  async addSubmission(submission: Omit<Submission, 'id' | 'date' | 'score' | 'image' | 'assignedJudges'>): Promise<Submission> {
    if (!supabase) throw new Error('Supabase not configured');

    // Need to find program and category IDs
    const programs = await this.getPrograms();
    const program = programs[0];
    if (!program) throw new Error('No programs found. Create a program first.');

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

    const created: Submission = {
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
    await this.safeAuditLog({
      action: 'Created submission',
      actionType: 'create',
      resourceType: 'submission',
      resourceId: created.id,
      details: created.title,
      metadata: { title: created.title, programId: program.id, category: created.category, applicant: created.applicant },
    });
    return created;
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

    if (updates.status) {
      await this.safeAuditLog({
        action: 'Updated submission status (bulk)',
        actionType: 'update',
        resourceType: 'submission',
        details: `${ids.length} submissions -> ${updates.status}`,
        metadata: { ids, status: updates.status },
      });
    }
  }

  async deleteSubmissions(ids: string[]) {
    for (const id of ids) {
      const { error } = await submissions.delete(id);
      if (error) throw new Error(error.message || 'Failed to delete submission');
    }
    await this.safeAuditLog({
      action: 'Deleted submissions (bulk)',
      actionType: 'delete',
      resourceType: 'submission',
      details: `${ids.length} submissions`,
      metadata: { ids },
    });
  }

  async assignJudgesToSubmissions(submissionIds: string[], judgeIds: string[], options?: { replaceExisting?: boolean }) {
    for (const submissionId of submissionIds) {
      const { error } = await submissions.assignJudges(submissionId, judgeIds, options?.replaceExisting);
      if (error) throw new Error(error.message || 'Failed to assign judges');
    }
    await this.safeAuditLog({
      action: 'Assigned judges to submissions (bulk)',
      actionType: 'update',
      resourceType: 'submission',
      details: `${submissionIds.length} submissions; ${judgeIds.length} judges`,
      metadata: { submissionIds, judgeIds },
    });
  }

  // Judges
  async getJudges(programId?: string): Promise<Judge[]> {
    const { data, error } = await judges.getAll(programId);
    if (error || !data) return [];

    return data.map((j: any) => ({
      id: j.id,
      name: j.name,
      avatar: resolveMediaPublicUrl(j.avatar_url),
      email: j.email,
      status: this.mapJudgeStatus(j.status) as Judge['status'],
      progress: j.completed_count && j.assigned_count
        ? Math.round((j.completed_count / j.assigned_count) * 100)
        : 0,
      assignedCount: j.assigned_count || 0,
      completedCount: j.completed_count || 0,
    }));
  }

  async getJudgesPaginated(options?: {
    programId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<Judge>> {
    if (!supabase) {
      return { items: [], total: 0, page: 1, pageSize: 12, hasMore: false };
    }

    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, Math.min(50, options?.pageSize || 12));
    const offset = (page - 1) * pageSize;
    const orgId = await getCurrentOrgId();

    if (!orgId) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    let query = supabase
      .from('judges')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('name');

    if (options?.programId) {
      query = query.eq('program_id', options.programId);
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1);
    if (error || !data) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    const items: Judge[] = data.map((j: any) => ({
      id: j.id,
      name: j.name,
      avatar: resolveMediaPublicUrl(j.avatar_url),
      email: j.email,
      status: this.mapJudgeStatus(j.status) as Judge['status'],
      progress: j.completed_count && j.assigned_count
        ? Math.round((j.completed_count / j.assigned_count) * 100)
        : 0,
      assignedCount: j.assigned_count || 0,
      completedCount: j.completed_count || 0,
    }));

    const total = count || 0;
    return {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + items.length < total,
    };
  }

  async createJudge(payload: { name: string; email: string; bio?: string; programId?: string }) {
    const { data, error } = await judges.create(payload);
    if (error) throw new Error(error.message || 'Failed to add judge');
    await this.safeAuditLog({
      action: 'Added judge',
      actionType: 'create',
      resourceType: 'judge',
      resourceId: (data as any)?.id,
      details: payload.email,
    });
    return data;
  }

  async inviteJudge(payload: { name: string; email: string; programId?: string }): Promise<any> {
    const { data, error } = await judges.invite(payload.email, payload.name, payload.programId);
    if (error) throw new Error(error.message || 'Failed to invite judge');
    await this.safeAuditLog({
      action: 'Invited judge',
      actionType: 'create',
      resourceType: 'judge',
      resourceId: (data as any)?.id,
      details: payload.email,
    });
    return data; // Includes invite_token for magic link
  }

  async deleteJudge(judgeId: string): Promise<void> {
    const { error } = await judges.delete(judgeId);
    if (error) throw new Error(error.message || 'Failed to remove judge');
    await this.safeAuditLog({
      action: 'Removed judge',
      actionType: 'delete',
      resourceType: 'judge',
      resourceId: judgeId,
      details: `Judge ${judgeId} removed`,
      metadata: { judgeId },
    });
  }

  async deleteAllJudges(programId?: string): Promise<void> {
    const { error } = await judges.deleteAll(programId);
    if (error) throw new Error(error.message || 'Failed to remove all judges');
    await this.safeAuditLog({
      action: 'Removed all judges',
      actionType: 'delete',
      resourceType: 'judge',
      resourceId: programId || 'all',
      details: programId ? `All judges removed from program ${programId}` : 'All judges removed',
      metadata: { programId },
    });
  }

  private mapJudgeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'invited': 'Invited',
      'completed': 'Completed',
    };
    return statusMap[status?.toLowerCase()] || 'Invited';
  }


  // Roles
  async getRoles(programId?: string): Promise<Role[]> {
    const { data, error } = await roles.getAll(programId);
    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      permissions: r.role_permissions?.map((rp: any) => rp.permissions?.key) || [],
      usersCount: 0, // Would need to count organization_members
      color: r.color || 'bg-slate-100 text-slate-700',
    }));
  }

  async createRole(role: { name: string; permissions: string[]; color?: string; programId?: string }) {
    const { data, error } = await roles.create(role);
    if (error) throw new Error(error.message || 'Failed to create role');
    await this.safeAuditLog({
      action: 'Created role',
      actionType: 'create',
      resourceType: 'role',
      resourceId: (data as any)?.id,
      details: role.name,
      metadata: { name: role.name, permissions: role.permissions, programId: role.programId },
    });
    return data;
  }

  async updateRole(role: { id: string; name?: string; color?: string; permissions?: string[] }) {
    if (!role.id) throw new Error('Role id is required');

    if (role.name || role.color) {
      const { error } = await roles.update(role.id, { name: role.name, color: role.color } as any);
      if (error) throw new Error(error.message || 'Failed to update role');
    }

    if (role.permissions) {
      await this.updateRolePermissions(role.id, role.permissions);
    }

    await this.safeAuditLog({
      action: 'Updated role',
      actionType: 'update',
      resourceType: 'role',
      resourceId: role.id,
      details: role.name || role.id,
      metadata: { name: role.name, permissionsCount: role.permissions?.length },
    });
  }

  async updateRolePermissions(roleId: string, permissionKeys: string[]) {
    const { error } = await roles.updatePermissions(roleId, permissionKeys);
    if (error) throw new Error(error.message || 'Failed to update role permissions');
  }

  async deleteRole(roleId: string) {
    const { error } = await roles.delete(roleId);
    if (error) throw new Error(error.message || 'Failed to delete role');
    await this.safeAuditLog({
      action: 'Deleted role',
      actionType: 'delete',
      resourceType: 'role',
      resourceId: roleId,
    });
  }

  // Team members (organization_members)
  async getTeamMembers(programId?: string): Promise<TeamMember[]> {
    const { data, error } = await team.getMembers(programId);
    if (error || !data) return [];

    return (data as any[]).map((m: any) => {
      const profile = m.profiles || {};
      const role = m.roles || {};
      return {
        memberId: m.id,
        userId: profile.id || m.user_id,
        name: profile.full_name || 'User',
        email: profile.email || '',
        role: role.name || 'Member',
        status: (m.status === 'active' ? 'Active' : 'Inactive') as TeamMember['status'],
        lastActive: profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '—',
        avatar: resolveMediaPublicUrl(profile.avatar_url),
        joinedDate: m.joined_at ? new Date(m.joined_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      };
    });
  }

  async updateTeamMemberRole(memberId: string, roleId: string, programId?: string) {
    const { error } = await team.updateMemberRole(memberId, roleId, programId);
    if (error) throw new Error(error.message || 'Failed to update member role');
    await this.safeAuditLog({
      action: 'Updated team member role',
      actionType: 'update',
      resourceType: 'organization_member',
      resourceId: memberId,
      metadata: { roleId },
    });
  }

  async addTeamMemberByEmail(email: string, roleId: string, programId?: string) {
    const { error } = await team.addMemberByEmail(email, roleId, programId);
    if (error) throw new Error(error.message || 'Failed to add team member');
    await this.safeAuditLog({
      action: 'Added team member',
      actionType: 'create',
      resourceType: 'organization_member',
      details: email,
      metadata: { email, roleId, programId },
    });
  }


  // Audit logs
  async getLogs(): Promise<Log[]> {
    const { data, error } = await auditLogs.getAll({ limit: 100 });
    if (error || !data) return [];

    return (data as any[]).map((l: any) => ({
      id: l.id,
      action: l.action,
      user: l.user_name || 'User',
      userAvatar: resolveMediaPublicUrl(l.user_avatar),
      details: l.details || '',
      timestamp: l.created_at ? new Date(l.created_at).toLocaleString() : '',
      type: (l.action_type === 'delete' ? 'delete' : l.action_type === 'warning' ? 'warning' : l.action_type === 'create' ? 'create' : 'update') as Log['type'],
    }));
  }

  async getLogsPaginated(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: 'create' | 'update' | 'delete' | 'warning';
  }): Promise<PaginatedResult<Log>> {
    if (!supabase) {
      return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
    }

    const orgId = await getCurrentOrgId();
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, Math.min(100, options?.pageSize || 20));
    const offset = (page - 1) * pageSize;

    if (!orgId) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('action_type', options.type);
    }

    const search = options?.search?.trim();
    if (search) {
      query = query.or(`action.ilike.%${search}%,details.ilike.%${search}%,user_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1);
    if (error || !data) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    const items: Log[] = data.map((l: any) => ({
      id: l.id,
      action: l.action,
      user: l.user_name || 'User',
      userAvatar: resolveMediaPublicUrl(l.user_avatar),
      details: l.details || '',
      timestamp: l.created_at ? new Date(l.created_at).toLocaleString() : '',
      type: (l.action_type === 'delete' ? 'delete' : l.action_type === 'warning' ? 'warning' : l.action_type === 'create' ? 'create' : 'update') as Log['type'],
    }));

    const total = count || 0;
    return {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + items.length < total,
    };
  }

  async getNotifications(options?: {
    programId?: string;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<DashboardNotification[]> {
    if (!supabase) return [];

    try {
      const orgId = await getCurrentOrgId();
      if (!orgId) return [];

      const userId = await getCurrentUserId();
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (options?.programId) {
        query = query.eq('program_id', options.programId);
      }

      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }

      // Show org-wide notifications plus user-specific notifications.
      if (userId) {
        query = query.or(`recipient_user_id.is.null,recipient_user_id.eq.${userId}`);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((n: any) => ({
        id: n.id,
        type: n.type || 'system',
        title: n.title || 'Notification',
        body: n.body || '',
        isRead: !!n.is_read,
        programId: n.program_id || null,
        createdAt: n.created_at || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async markNotificationRead(notificationId: string) {
    if (!supabase) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch {
      // Ignore best-effort update failures.
    }
  }

  async markAllNotificationsRead(programId?: string) {
    if (!supabase) return;

    try {
      const orgId = await getCurrentOrgId();
      if (!orgId) return;

      const userId = await getCurrentUserId();
      let query = supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('organization_id', orgId)
        .eq('is_read', false);

      if (programId) {
        query = query.eq('program_id', programId);
      }

      if (userId) {
        query = query.or(`recipient_user_id.is.null,recipient_user_id.eq.${userId}`);
      }

      await query;
    } catch {
      // Ignore best-effort update failures.
    }
  }

  // Reach
  async getSocialAccounts(): Promise<SocialAccount[]> {
    const { data, error } = await socialAccounts.getAll();
    if (error || !data) return [];

    return (data as any[]).map((a: any) => ({
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      status: a.status === 'connected' ? 'Connected' : 'Disconnected',
      avatar: resolveMediaPublicUrl(a.avatar_url),
    }));
  }

  async getScheduledPosts(): Promise<ScheduledPost[]> {
    const { data, error } = await scheduledPosts.getAll();
    if (error || !data) return [];

    return (data as any[]).map((p: any) => ({
      id: p.id,
      content: p.content,
      image: p.image_url || undefined,
      platforms: p.platforms || [],
      scheduledFor: p.scheduled_for,
      trigger: (p.trigger_type || 'Manual') as ScheduledPost['trigger'],
      status: (p.status === 'posted' ? 'Posted' : p.status === 'draft' ? 'Draft' : 'Scheduled') as ScheduledPost['status'],
    }));
  }

  // Settings
  async getProfile() {
    return settings.getProfile();
  }

  async updateProfile(updates: any) {
    const res = await settings.updateProfile(updates);
    if (!(res as any)?.error) {
      await this.safeAuditLog({
        action: 'Updated profile',
        actionType: 'update',
        resourceType: 'profile',
      });
    }
    return res;
  }

  async getOrganization() {
    return settings.getOrganization();
  }

  async updateOrganization(updates: any) {
    const res = await settings.updateOrganization(updates);
    if (!(res as any)?.error) {
      await this.safeAuditLog({
        action: 'Updated organization settings',
        actionType: 'update',
        resourceType: 'organization',
      });
    }
    return res;
  }

  async getUserSettings() {
    return settings.getUserSettings();
  }

  async updateUserSettings(updates: any) {
    const res = await settings.updateUserSettings(updates);
    if (!(res as any)?.error) {
      await this.safeAuditLog({
        action: 'Updated user settings',
        actionType: 'update',
        resourceType: 'user_settings',
      });
    }
    return res;
  }

  // Forms
  async getForms(programId: string) {
    const { data, error } = await forms.getByProgram(programId);
    if (error || !data) return [];
    return data;
  }

  async getFormFields(formId: string) {
    const { data, error } = await forms.getFields(formId);
    if (error || !data) return [];
    return data;
  }

  async createForm(payload: { program_id: string; title: string; description?: string; is_active?: boolean }) {
    const { data, error } = await forms.create(payload);
    if (error) throw new Error(error.message || 'Failed to create form');
    await this.safeAuditLog({
      action: 'Created form',
      actionType: 'create',
      resourceType: 'program_form',
      resourceId: (data as any)?.id,
      details: payload.title,
      metadata: { programId: payload.program_id },
    });
    return data;
  }

  async updateForm(id: string, updates: any) {
    const { data, error } = await forms.update(id, updates);
    if (error) throw new Error(error.message || 'Failed to update form');
    await this.safeAuditLog({
      action: 'Updated form',
      actionType: 'update',
      resourceType: 'program_form',
      resourceId: id,
    });
    return data;
  }

  async deleteForm(id: string) {
    const { error } = await forms.delete(id);
    if (error) throw new Error(error.message || 'Failed to delete form');
    await this.safeAuditLog({
      action: 'Deleted form',
      actionType: 'delete',
      resourceType: 'program_form',
      resourceId: id,
    });
  }

  async replaceFormFields(formId: string, fieldsPayload: any[]) {
    const { error } = await forms.replaceFields(formId, fieldsPayload);
    if (error) throw new Error(error.message || 'Failed to save form fields');
    await this.safeAuditLog({
      action: 'Updated form fields',
      actionType: 'update',
      resourceType: 'program_form',
      resourceId: formId,
      metadata: { fieldsCount: fieldsPayload?.length || 0 },
    });
  }

  async submitFormResponse(
    formId: string,
    formData: Record<string, any>,
    options?: {
      paymentRequired?: boolean;
      paymentAmount?: number;
    }
  ) {
    if (!supabase) throw new Error('Supabase not configured');

    // Get the form to find the program_id
    const { data: form, error: formError } = await supabase
      .from('program_forms')
      .select('program_id, title, is_active')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      throw new Error(formError?.message || 'Form not found');
    }

    if (!form.is_active) {
      throw new Error('This nomination form is not published.');
    }

    // Get current user info
    const userId = await getCurrentUserId();
    const profile = userId
      ? await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()
      : null;

    // Create submission with form data in submission_data field
    // Set allowPublicSubmission flag to allow submissions from any authenticated user
    const { data, error } = await submissions.create({
      program_id: form.program_id,
      title: form.title || 'Form Submission',
      description: `Form submission for ${form.title}`,
      payment_status: options?.paymentRequired ? 'pending' : 'paid',
      payment_amount: options?.paymentRequired ? Number(options.paymentAmount || 0) : 0,
      submission_data: {
        form_id: formId,
        form_title: form.title,
        responses: formData,
        submitted_at: new Date().toISOString(),
      },
      allowPublicSubmission: true, // Allow public form submissions
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to submit form');
    }

    // Update with applicant name/email if available
    if (profile?.data) {
      await supabase
        .from('submissions')
        .update({
          applicant_name: profile.data.full_name || null,
          applicant_email: profile.data.email || null,
        })
        .eq('id', (data as any).id);
    }

    await this.safeAuditLog({
      action: 'Submitted form response',
      actionType: 'create',
      resourceType: 'submission',
      resourceId: (data as any).id,
      details: `Form: ${form.title}`,
      metadata: { formId, programId: form.program_id },
    });

    // Auto-enroll submission in the first round of the pipeline
    const submissionId = (data as any).id;
    try {
      await this.enrollSubmissionInFirstRound(form.program_id, submissionId);
    } catch (e) {
      // Non-fatal: submission was created but pipeline enrollment failed
      console.warn('[pipeline] Failed to auto-enroll submission in first round:', e);
    }

    return data;
  }

  // Stats
  async getStats(programId?: string) {
    const submissions = await this.getSubmissions(programId);
    const programs = await this.getPrograms();
    const judges = await this.getJudges(programId);

    const activePrograms = programs.filter(p => p.status === 'Active');

    // Calculate Trends (Last 7 Days)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const submissionTrend = last7Days.map(date => {
      const count = submissions.filter(s => s.date === date).length;
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      return { name: dayName, entries: count };
    });

    // Calculate Category Split
    const categoryCounts: Record<string, number> = {};
    submissions.forEach(s => {
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    });

    const categorySplit = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    return {
      totalSubmissions: submissions.length,
      activePrograms: activePrograms.length,
      pendingReview: submissions.filter(s =>
        s.status === 'Pending' || s.status === 'Under Review'
      ).length,
      revenue: await this.calculateRevenue(programId),
      activeJudges: judges.filter(j => j.status === 'Active').length,
      submissionTrend,
      categorySplit
    };
  }

  // Calculate real revenue from paid submissions
  private async calculateRevenue(programId?: string): Promise<number> {
    if (!supabase) return 0;
    try {
      let query = supabase
        .from('submissions')
        .select('payment_amount')
        .eq('payment_status', 'paid');
      if (programId) query = query.eq('program_id', programId);
      const { data } = await query;
      if (!data || data.length === 0) return 0;
      return data.reduce((sum, s) => sum + (Number(s.payment_amount) || 0), 0);
    } catch {
      return 0;
    }
  }

  // Current User (from auth)
  async getCurrentUser(): Promise<any | null> {
    const { user } = await auth.getUser();
    if (!user) return null;

    if (!supabase) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    // Look up actual role from organization_members
    let roleName = 'Member';
    try {
      if (this.cachedRoleName) {
        roleName = this.cachedRoleName;
      } else if (this.currentOrgId) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('roles(name)')
          .eq('user_id', user.id)
          .eq('organization_id', this.currentOrgId)
          .maybeSingle();
        if (membership?.roles && (membership.roles as any).name) {
          roleName = (membership.roles as any).name;
        }
      }
    } catch {
      // Fall back to default
    }

    return {
      id: user.id,
      name: profile.full_name || user.email || 'User',
      email: user.email || '',
      role: roleName,
      status: 'Active',
      lastActive: 'Now',
      avatar: resolveMediaPublicUrl(profile.avatar_url),
      source: 'Internal',
      surveyAnswer: '',
      joinedDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    };
  }

  async deleteRound(roundId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error: edgeDeleteError } = await supabase
      .from('round_edges')
      .delete()
      .or(`source_round_id.eq.${roundId},target_round_id.eq.${roundId}`);
    if (edgeDeleteError) throw new Error(edgeDeleteError.message || 'Failed to delete round connections');

    const { error } = await supabase.from('rounds').delete().eq('id', roundId);
    if (error) throw new Error(error.message || 'Failed to delete round');
    await this.safeAuditLog({
      action: 'Deleted round',
      actionType: 'delete',
      resourceType: 'round',
      resourceId: roundId,
    });
  }

  // ── Judging / Scores ──────────────────────────────────────────────────────

  async submitScores(
    submissionJudgeId: string,
    criteriaScores: { criterionId: string; score: number; comment?: string }[],
    overallComment?: string,
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    // 1. Save individual criterion scores
    const rows = criteriaScores.map(cs => ({
      submission_judge_id: submissionJudgeId,
      criterion_id: cs.criterionId,
      score: cs.score,
      comment: cs.comment || null,
      scored_at: new Date().toISOString(),
    }));
    const { error: scoresError } = await supabase
      .from('scores')
      .upsert(rows, { onConflict: 'submission_judge_id,criterion_id' });
    if (scoresError) throw new Error(scoresError.message || 'Failed to submit scores');

    // 2. Save overall comment if provided
    if (overallComment) {
      const { error: commentError } = await supabase
        .from('judge_comments')
        .upsert({
          submission_judge_id: submissionJudgeId,
          overall_comment: overallComment,
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'submission_judge_id' });
      if (commentError) console.warn('Failed to save overall comment:', commentError);
    }

    // 3. Mark submission_judge as completed
    const { error: updateError } = await supabase
      .from('submission_judges')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', submissionJudgeId);
    if (updateError) console.warn('Failed to update assignment status:', updateError);

    await this.safeAuditLog({
      action: 'Submitted judging scores',
      actionType: 'create',
      resourceType: 'scores',
      resourceId: submissionJudgeId,
    });
  }

  async getScoresForSubmission(submissionId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('submission_judges')
      .select(`
        id,
        status,
        completed_at,
        judges ( id, name, avatar_url ),
        judge_comments ( overall_comment, recommendation, submitted_at ),
        scores ( score, comment, criterion_id, judging_criteria ( name, weight ) )
      `)
      .eq('submission_id', submissionId);
    if (error || !data) return [];
    return data;
  }

  // ── Rounds (update + reorder) ──────────────────────────────────────────────

  async updateRound(round: Partial<Round> & { id: string }): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const payload: Record<string, unknown> = {};
    if (round.title !== undefined) payload.title = round.title;
    if (round.type !== undefined) payload.type = round.type;
    if (round.startDate !== undefined) payload.start_date = round.startDate;
    if (round.endDate !== undefined) payload.end_date = round.endDate;
    if (round.status !== undefined) payload.status = round.status.toLowerCase();
    if (round.description !== undefined) payload.description = round.description;
    const { error } = await supabase.from('rounds').update(payload).eq('id', round.id);
    if (error) throw new Error(error.message || 'Failed to update round');
    await this.safeAuditLog({
      action: 'Updated round',
      actionType: 'update',
      resourceType: 'round',
      resourceId: round.id,
    });
  }

  async reorderRounds(programId: string, orderedIds: string[]): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const rows = orderedIds.map((id, index) => ({ id, program_id: programId, sort_order: index }));
    const { error } = await supabase.from('rounds').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message || 'Failed to reorder rounds');
  }

  // ── Team members ───────────────────────────────────────────────────────────

  async removeTeamMember(memberId: string): Promise<void> {
    const { error } = await team.removeMember(memberId);
    if (error) throw new Error(error.message || 'Failed to remove member');
    await this.safeAuditLog({
      action: 'Removed team member',
      actionType: 'delete',
      resourceType: 'organization_member',
      resourceId: memberId,
    });
  }

  async getPendingTeamInvites(organizationId: string): Promise<PendingInvite[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('organization_invites')
      .select('id, email, token, status, created_at, role_id, program_id, roles ( name )')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as any[]).map((row) => ({
      id: row.id,
      email: row.email,
      token: row.token,
      roleId: row.role_id || null,
      roleName: row.roles?.name || null,
      programId: row.program_id || null,
      createdAt: row.created_at,
    }));
  }

  async cancelTeamInvite(inviteId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('organization_invites')
      .update({ status: 'expired' })
      .eq('id', inviteId)
      .eq('status', 'pending');
    if (error) throw new Error(error.message || 'Failed to cancel invite');
  }

  // ========================================================================
  // ROUND PIPELINE — Form-to-Round Enrollment
  // ========================================================================

  /**
   * Find the root round (no incoming edges) for a program and enroll a submission.
   */
  async enrollSubmissionInFirstRound(programId: string, submissionId: string) {
    if (!supabase) return;

    // Get all rounds for the program
    const { data: allRounds } = await supabase
      .from('rounds')
      .select('id')
      .eq('program_id', programId);
    if (!allRounds || allRounds.length === 0) return;

    // Get all edges to find which rounds are targets (have incoming edges)
    const { data: edges } = await supabase
      .from('round_edges')
      .select('target_round_id')
      .eq('program_id', programId);

    const targetIds = new Set((edges || []).map(e => e.target_round_id));
    // Root rounds = rounds with no incoming edges
    const rootRounds = allRounds.filter(r => !targetIds.has(r.id));

    if (rootRounds.length === 0) return;

    // Enroll in the first root round (typically the nomination/submission round)
    await roundSubmissions.enroll(rootRounds[0].id, submissionId);
  }

  async getActiveFormForProgram(programId: string): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from('programs')
      .select('active_form_id')
      .eq('id', programId)
      .single();
    return data?.active_form_id || null;
  }

  async setActiveFormForProgram(programId: string, formId: string | null) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('programs')
      .update({ active_form_id: formId })
      .eq('id', programId);
    if (error) throw new Error(error.message || 'Failed to set active form');
    await this.safeAuditLog({
      action: formId ? 'Set active form' : 'Cleared active form',
      actionType: 'update',
      resourceType: 'program',
      resourceId: programId,
      metadata: { formId },
    });
  }

  // ========================================================================
  // ROUND SUBMISSIONS — Query helpers
  // ========================================================================

  async getRoundSubmissions(roundId: string) {
    return roundSubmissions.getByRound(roundId);
  }

  async getRoundSubmissionCounts(roundId: string) {
    return roundSubmissions.countByRound(roundId);
  }

  async getSubmissionRoundHistory(submissionId: string) {
    return roundSubmissions.getBySubmission(submissionId);
  }

  // ========================================================================
  // VOTING CONFIGS
  // ========================================================================

  async getVotingConfig(roundId: string) {
    return votingConfigs.getByRound(roundId);
  }

  async saveVotingConfig(config: Parameters<typeof votingConfigs.upsert>[0]) {
    return votingConfigs.upsert(config);
  }

  // ========================================================================
  // ADVANCEMENT
  // ========================================================================

  async getAdvancementHistory(programId: string) {
    return advancement.getEventsByProgram(programId);
  }

  async getAdvancementEventsByRound(roundId: string) {
    return advancement.getEventsByRound(roundId);
  }

  hasPermission(permission: string): boolean {
    // Fail-open so the UI doesn't go blank if permissions haven't been seeded/configured yet.
    // Once permissions are present, this will correctly enforce them.
    const roleName = (this.cachedRoleName || '').toLowerCase();
    if (roleName === 'admin' || roleName === 'owner' || roleName === 'superadmin') return true;

    // If we haven't loaded permissions (or user isn't in organization_members yet),
    // don't hard-block navigation.
    if (!this.cachedPermissions) return true;

    // If permissions exist but are empty (common right after schema setup),
    // allow access until permissions are assigned.
    if (this.cachedPermissions.size === 0) return true;

    if (this.cachedPermissions.has('all')) return true;
    return this.cachedPermissions.has(permission);
  }
}

export const db = new DatabaseService();

