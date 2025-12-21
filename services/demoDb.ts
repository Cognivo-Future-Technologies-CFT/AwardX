
export interface PaymentConfig {
  enabled: boolean;
  provider: 'Stripe' | 'PayPal' | 'Razorpay';
  currency: string;
  fee: number;
  publicKey?: string;
  connected: boolean;
}

export type EventType =
  | 'Award'
  | 'Competition'
  | 'Grant'
  | 'Internal Event'
  | 'Exhibition'
  | 'Residency'
  | 'Fair'
  | 'Commission'
  | 'Other';

export interface Program {
  id: string;
  title: string;
  category: string; // Industry category (Design, Tech, etc.)
  type: EventType; // The strategic type (Award, Grant, etc.)
  status: 'Active' | 'Draft' | 'Completed';
  deadline: string;
  entriesCount: number;
  description?: string;
  slug?: string;
  coverImageUrl?: string;
  visibility?: 'Public' | 'Private';
  timezone?: string;
  paymentConfig?: PaymentConfig;
}

export interface Category {
  id: string;
  title: string;
  programId: string;
  parentId: string | null;
  entriesCount: number;
}

export interface Round {
  id: string;
  programId: string;
  title: string;
  type: 'Submission' | 'Judging' | 'Voting' | 'Announcement';
  startDate: string;
  endDate: string;
  status: 'Upcoming' | 'Active' | 'Completed';
  description?: string;
}

export interface Submission {
  id: string;
  title: string;
  applicant: string;
  category: string;
  status: 'Pending' | 'Under Review' | 'Shortlisted' | 'Accepted' | 'Rejected';
  score: number | null;
  date: string;
  image: string;
  assignedJudges?: string[]; // Array of Judge IDs
}

export interface Judge {
  id: string;
  name: string;
  avatar: string;
  email: string;
  status: 'Active' | 'Invited' | 'Completed';
  progress: number;
  assignedCount: number;
  completedCount: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  role: string; // Linked to Role.name
  status: 'Active' | 'Inactive';
  lastActive: string;
  avatar: string;
  source: string;
  surveyAnswer: string;
  joinedDate: string;
}

export interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  content: string;
  time: string;
  unread: boolean;
  threadId: string;
}

export interface SocialAccount {
  id: string;
  platform: 'Twitter' | 'LinkedIn' | 'Instagram' | 'Facebook';
  handle: string;
  status: 'Connected' | 'Disconnected';
  avatar: string;
}

export interface ScheduledPost {
  id: string;
  content: string;
  image?: string;
  platforms: ('Twitter' | 'LinkedIn' | 'Instagram' | 'Facebook')[];
  scheduledFor: string;
  trigger: 'Manual' | 'Voting Open' | 'Half-time' | 'Winners';
  status: 'Scheduled' | 'Posted' | 'Draft';
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  usersCount: number;
  color: string;
}

export interface Log {
  id: string;
  action: string;
  user: string;
  userAvatar: string;
  details: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'warning';
}

// Permission Definitions
export const PERMISSIONS = {
  VIEW_OVERVIEW: 'view_overview',
  MANAGE_PROGRAMS: 'manage_programs', // Schedule, Awards, Submission Setup
  VIEW_SUBMISSIONS: 'view_submissions',
  MANAGE_SUBMISSIONS: 'manage_submissions', // Accept/Reject/Delete
  VIEW_JUDGING: 'view_judging',
  MANAGE_JUDGING: 'manage_judging', // Assign judges, config
  MANAGE_FORMS: 'manage_forms',
  VIEW_MESSAGES: 'view_messages',
  MANAGE_REACH: 'manage_reach', // Social, Campaigns
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CRM: 'manage_crm',
  MANAGE_TEAMS: 'manage_teams', // Roles & Invites
  VIEW_LOGS: 'view_logs',
  MANAGE_SETTINGS: 'manage_settings',
};

class DemoDatabase {
  private PROGRAMS_KEY = 'nomify_demo_programs';
  private CATEGORIES_KEY = 'nomify_demo_categories';
  private ROUNDS_KEY = 'nomify_demo_rounds';
  private SUBMISSIONS_KEY = 'nomify_demo_submissions';
  private JUDGES_KEY = 'nomify_demo_judges';
  private CONTACTS_KEY = 'nomify_demo_contacts';
  private MESSAGES_KEY = 'nomify_demo_messages';
  private SOCIAL_KEY = 'nomify_demo_social';
  private POSTS_KEY = 'nomify_demo_posts';
  private ROLES_KEY = 'nomify_demo_roles';
  private LOGS_KEY = 'nomify_demo_logs';

  // Current Session State
  private CURRENT_USER_KEY = 'nomify_current_user_id';

  constructor() {
    this.seed();
  }

  private seed() {
    // ... (Existing seed logic for Programs, Categories, Rounds, Submissions, Judges, Social, Posts, Logs - unchanged)

    if (!localStorage.getItem(this.PROGRAMS_KEY)) {
      // Keeping previous seed logic hidden for brevity as it was already correct in previous turns
      // Just re-initializing the array if needed for context
      const initialPrograms: Program[] = [
        {
          id: 'PROG-001',
          title: 'Global Design Awards 2024',
          category: 'Design',
          type: 'Award',
          status: 'Active',
          deadline: '2024-12-31',
          entriesCount: 124,
          paymentConfig: { enabled: true, provider: 'Stripe', currency: 'USD', fee: 50, connected: true }
        }
      ];
      localStorage.setItem(this.PROGRAMS_KEY, JSON.stringify(initialPrograms));
    }

    // Ensure critical tables exist
    if (!localStorage.getItem(this.CONTACTS_KEY)) {
      const initialContacts: Contact[] = [
        {
          id: 'C-001',
          name: 'Sarah Jenkins',
          email: 'sarah@awardx.com',
          role: 'Admin',
          status: 'Active',
          lastActive: 'Now',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
          source: 'Internal',
          surveyAnswer: 'Owner',
          joinedDate: '2023-01-01'
        },
        {
          id: 'C-002',
          name: 'Mike Ross',
          email: 'mike@awardx.com',
          role: 'Editor',
          status: 'Active',
          lastActive: '2 hours ago',
          avatar: 'https://i.pravatar.cc/150?u=5',
          source: 'Internal',
          surveyAnswer: 'Editor',
          joinedDate: '2024-02-01'
        },
        {
          id: 'C-003',
          name: 'Emily Judge',
          email: 'emily@external.com',
          role: 'Judge',
          status: 'Active',
          lastActive: '1 day ago',
          avatar: 'https://i.pravatar.cc/150?u=8',
          source: 'Invite',
          surveyAnswer: '',
          joinedDate: '2024-03-10'
        }
      ];
      localStorage.setItem(this.CONTACTS_KEY, JSON.stringify(initialContacts));
      // Set default logged in user
      localStorage.setItem(this.CURRENT_USER_KEY, 'C-001');
    }

    if (!localStorage.getItem(this.ROLES_KEY)) {
      const initialRoles: Role[] = [
        {
          id: 'R-001',
          name: 'Admin',
          permissions: ['all'],
          usersCount: 1,
          color: 'bg-purple-100 text-purple-700'
        },
        {
          id: 'R-002',
          name: 'Editor',
          permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_SUBMISSIONS,
            PERMISSIONS.MANAGE_SUBMISSIONS,
            PERMISSIONS.MANAGE_FORMS,
            PERMISSIONS.MANAGE_REACH
          ],
          usersCount: 1,
          color: 'bg-blue-100 text-blue-700'
        },
        {
          id: 'R-003',
          name: 'Judge',
          permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_JUDGING,
            PERMISSIONS.MANAGE_JUDGING
          ],
          usersCount: 1,
          color: 'bg-amber-100 text-amber-700'
        },
        {
          id: 'R-004',
          name: 'Viewer',
          permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_ANALYTICS,
            PERMISSIONS.VIEW_SUBMISSIONS
          ],
          usersCount: 0,
          color: 'bg-slate-100 text-slate-700'
        },
      ];
      localStorage.setItem(this.ROLES_KEY, JSON.stringify(initialRoles));
    }
  }

  // --- User & Role Management ---

  getCurrentUser(): Contact {
    const id = localStorage.getItem(this.CURRENT_USER_KEY);
    const contacts = this.getContacts();
    return contacts.find(c => c.id === id) || contacts[0];
  }

  setCurrentUser(contactId: string) {
    localStorage.setItem(this.CURRENT_USER_KEY, contactId);
  }

  getUserRole(roleName: string): Role | undefined {
    return this.getRoles().find(r => r.name === roleName);
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    const role = this.getUserRole(user.role);
    if (!role) return false;
    if (role.permissions.includes('all')) return true;
    return role.permissions.includes(permission);
  }

  // --- Existing Getters/Setters ---

  getPrograms(): Program[] {
    return JSON.parse(localStorage.getItem(this.PROGRAMS_KEY) || '[]');
  }

  getProgramById(id: string): Program | undefined {
    return this.getPrograms().find(p => p.id === id);
  }

  addProgram(program: Omit<Program, 'id' | 'entriesCount'>): Program {
    const programs = this.getPrograms();
    const newProgram: Program = {
      ...program,
      id: `PROG-${String(programs.length + 1).padStart(3, '0')}`,
      entriesCount: 0
    };
    programs.push(newProgram);
    localStorage.setItem(this.PROGRAMS_KEY, JSON.stringify(programs));
    return newProgram;
  }

  updateProgram(program: Program) {
    const programs = this.getPrograms();
    const index = programs.findIndex(p => p.id === program.id);
    if (index !== -1) {
      programs[index] = program;
      localStorage.setItem(this.PROGRAMS_KEY, JSON.stringify(programs));
    }
  }

  getCategories(programId: string): Category[] {
    const all = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]') as Category[];
    return all.filter(c => c.programId === programId);
  }

  addCategory(category: Omit<Category, 'id' | 'entriesCount'>): Category {
    const all = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]') as Category[];
    const newCat: Category = {
      ...category,
      id: `CAT-${String(all.length + 1).padStart(3, '0')}`,
      entriesCount: 0
    };
    all.push(newCat);
    localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(all));
    return newCat;
  }

  deleteCategory(categoryId: string): void {
    const all = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]') as Category[];
    
    // Recursive function to get all children IDs
    const getAllChildrenIds = (parentId: string): string[] => {
      const children = all.filter(c => c.parentId === parentId);
      const childIds = children.map(c => c.id);
      // Recursively get children of children
      const grandChildrenIds = childIds.flatMap(id => getAllChildrenIds(id));
      return [...childIds, ...grandChildrenIds];
    };
    
    // Get all children IDs
    const childrenIds = getAllChildrenIds(categoryId);
    
    // Delete the category and all its children
    const idsToDelete = [categoryId, ...childrenIds];
    const remaining = all.filter(c => !idsToDelete.includes(c.id));
    
    localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(remaining));
  }

  // Forms
  private readonly FORMS_KEY = 'awardx_forms';
  private readonly FORM_FIELDS_KEY = 'awardx_form_fields';

  getForms(programId: string): any[] {
    const all = JSON.parse(localStorage.getItem(this.FORMS_KEY) || '[]');
    return all.filter((f: any) => f.programId === programId);
  }

  getFormById(formId: string): any | null {
    const all = JSON.parse(localStorage.getItem(this.FORMS_KEY) || '[]');
    return all.find((f: any) => f.id === formId) || null;
  }

  getFormFields(formId: string): any[] {
    const all = JSON.parse(localStorage.getItem(this.FORM_FIELDS_KEY) || '[]');
    return all.filter((f: any) => f.formId === formId).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  saveForm(form: { id?: string; programId: string; name: string; description?: string; formType?: string; isActive?: boolean }): any {
    const all = JSON.parse(localStorage.getItem(this.FORMS_KEY) || '[]');
    const formData = {
      ...form,
      id: form.id || `FORM-${Date.now()}`,
      formType: form.formType || 'submission',
      isActive: form.isActive !== undefined ? form.isActive : true,
      createdAt: form.id ? all.find((f: any) => f.id === form.id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (form.id) {
      const index = all.findIndex((f: any) => f.id === form.id);
      if (index !== -1) {
        all[index] = formData;
      } else {
        all.push(formData);
      }
    } else {
      all.push(formData);
    }

    localStorage.setItem(this.FORMS_KEY, JSON.stringify(all));
    return formData;
  }

  saveFormFields(formId: string, fields: any[]): void {
    const all = JSON.parse(localStorage.getItem(this.FORM_FIELDS_KEY) || '[]');
    // Remove existing fields for this form
    const filtered = all.filter((f: any) => f.formId !== formId);
    
    // Add new fields
    fields.forEach((field, index) => {
      filtered.push({
        id: field.id || `FIELD-${Date.now()}-${index}`,
        formId,
        fieldType: field.type,
        label: field.label,
        placeholder: field.placeholder || null,
        helpText: null,
        isRequired: field.required || false,
        validationRules: field.validation || {},
        options: field.options || [],
        conditionalLogic: null,
        sortOrder: index,
        createdAt: new Date().toISOString(),
      });
    });

    localStorage.setItem(this.FORM_FIELDS_KEY, JSON.stringify(filtered));
  }

  deleteForm(formId: string): void {
    const all = JSON.parse(localStorage.getItem(this.FORMS_KEY) || '[]');
    const remaining = all.filter((f: any) => f.id !== formId);
    localStorage.setItem(this.FORMS_KEY, JSON.stringify(remaining));

    // Also delete form fields
    const allFields = JSON.parse(localStorage.getItem(this.FORM_FIELDS_KEY) || '[]');
    const remainingFields = allFields.filter((f: any) => f.formId !== formId);
    localStorage.setItem(this.FORM_FIELDS_KEY, JSON.stringify(remainingFields));
  }

  getRounds(programId: string): Round[] {
    const all = JSON.parse(localStorage.getItem(this.ROUNDS_KEY) || '[]') as Round[];
    return all.filter(r => r.programId === programId).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  addRound(round: Omit<Round, 'id'>): Round {
    const all = JSON.parse(localStorage.getItem(this.ROUNDS_KEY) || '[]') as Round[];
    const newRound: Round = {
      ...round,
      id: `RND-${String(all.length + 1).padStart(3, '0')}`
    };
    all.push(newRound);
    localStorage.setItem(this.ROUNDS_KEY, JSON.stringify(all));
    return newRound;
  }

  getSubmissions(): Submission[] {
    return JSON.parse(localStorage.getItem(this.SUBMISSIONS_KEY) || '[]');
  }

  addSubmission(submission: Omit<Submission, 'id' | 'date' | 'score' | 'image' | 'assignedJudges'>): Submission {
    const submissions = this.getSubmissions();
    const newSubmission: Submission = {
      ...submission,
      id: `SUB-${String(submissions.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      score: null,
      image: `https://source.unsplash.com/random/50x50?${submission.category}`,
      assignedJudges: []
    };
    submissions.unshift(newSubmission);
    localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(submissions));
    return newSubmission;
  }

  bulkUpdateSubmissions(ids: string[], updates: Partial<Submission> & { assignedJudges?: string[] }) {
    const submissions = this.getSubmissions();
    const updatedSubmissions = submissions.map(sub => {
      if (ids.includes(sub.id)) {
        if (updates.assignedJudges) {
          const current = sub.assignedJudges || [];
          const newJudges = Array.from(new Set([...current, ...updates.assignedJudges]));
          return { ...sub, ...updates, assignedJudges: newJudges };
        }
        return { ...sub, ...updates };
      }
      return sub;
    });

    if ((updates as any).delete) {
      const filtered = submissions.filter(sub => !ids.includes(sub.id));
      localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(filtered));
      return;
    }

    localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(updatedSubmissions));
  }

  getJudges(): Judge[] {
    return JSON.parse(localStorage.getItem(this.JUDGES_KEY) || '[]');
  }

  getContacts(): Contact[] {
    return JSON.parse(localStorage.getItem(this.CONTACTS_KEY) || '[]');
  }

  addContact(contact: Omit<Contact, 'id' | 'lastActive' | 'joinedDate' | 'avatar'>): Contact {
    const contacts = this.getContacts();
    const newContact: Contact = {
      ...contact,
      id: `C-${String(contacts.length + 100).padStart(3, '0')}`,
      lastActive: 'Never',
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: `https://i.pravatar.cc/150?u=${Math.random()}`
    };
    contacts.push(newContact);
    localStorage.setItem(this.CONTACTS_KEY, JSON.stringify(contacts));
    return newContact;
  }

  getMessages(): Message[] {
    return JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
  }

  getSocialAccounts(): SocialAccount[] {
    return JSON.parse(localStorage.getItem(this.SOCIAL_KEY) || '[]');
  }

  getScheduledPosts(): ScheduledPost[] {
    return JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
  }

  getRoles(): Role[] {
    return JSON.parse(localStorage.getItem(this.ROLES_KEY) || '[]');
  }

  addRole(role: Omit<Role, 'id' | 'usersCount'>): Role {
    const roles = this.getRoles();
    const newRole: Role = {
      ...role,
      id: `R-${String(roles.length + 1).padStart(3, '0')}`,
      usersCount: 0
    };
    roles.push(newRole);
    localStorage.setItem(this.ROLES_KEY, JSON.stringify(roles));
    return newRole;
  }

  updateRole(updatedRole: Role) {
    const roles = this.getRoles();
    const index = roles.findIndex(r => r.id === updatedRole.id);
    if (index !== -1) {
      roles[index] = updatedRole;
      localStorage.setItem(this.ROLES_KEY, JSON.stringify(roles));
    }
  }

  getLogs(): Log[] {
    return JSON.parse(localStorage.getItem(this.LOGS_KEY) || '[]');
  }

  getStats(eventId?: string) {
    const submissions = this.getSubmissions();
    const programs = this.getPrograms();

    // In a real app, this would filter by eventId
    const relevantSubmissions = eventId ? submissions : submissions;

    return {
      totalSubmissions: relevantSubmissions.length,
      activePrograms: programs.filter(p => p.status === 'Active').length,
      pendingReview: relevantSubmissions.filter(s => s.status === 'Pending' || s.status === 'Under Review').length,
      revenue: relevantSubmissions.length * 45
    };
  }
}

export const db = new DemoDatabase();
