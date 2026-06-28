// Shared application models used by the Supabase-backed data layer and UI.
// These were originally defined in `services/demoDb.ts` and are kept here so
// the app can run fully on Supabase without the demo/localStorage database.

export interface PaymentConfig {
  enabled: boolean;
  provider: 'Stripe' | 'PayPal' | 'Razorpay';
  currency: string;
  fee: number;
  publicKey?: string;
  secretKey?: string;
  hasSecretKey?: boolean;
  connected: boolean;
}

export type EventType =
  | 'Accelerator & Incubator Programs'
  | 'Grants & Funding'
  | 'Academic Admissions'
  | 'Abstracts & Journals'
  | 'Personnel & Fellowships'
  | 'Creative Contests'
  | 'Other'
  // Legacy types retained for existing programs
  | 'Award'
  | 'Competition'
  | 'Grant'
  | 'Internal Event'
  | 'Exhibition'
  | 'Residency'
  | 'Fair'
  | 'Commission';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  plan?: string;
  eventCount?: number;
  createdAt?: string;
}

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
  kycEnabled?: boolean;
  kycProvider?: string;
  applicationMode?: 'standard' | 'hackathon';
  requireGithubAuth?: boolean;
  activeFormId?: string | null;
  integrationSources?: {
    resend?: string | null;
    didit?: string | null;
    payment?: string | null;
  };
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
  applicant?: string;
  applicantName?: string; // Preferred name from new data layer
  applicantEmail?: string;
  category: string;
  categoryId?: string | null;
  status: 'Pending' | 'Under Review' | 'Shortlisted' | 'Accepted' | 'Rejected';
  score: number | null;
  date?: string;
  submittedAt?: string; // Preferred date from new data layer
  image?: string;
  coverImageUrl?: string; // Preferred from new data layer
  assignedJudges?: string[]; // Array of Judge IDs
  votes?: number;
  voteCount?: number; // Alternative field name
  submissionData?: any;
  description?: string; // May come from submissions table
}


export interface Judge {
  id: string;
  name: string;
  avatar: string;
  email: string;
  status: 'Active' | 'Invited' | 'Completed' | 'Declined';
  progress: number;
  assignedCount: number;
  completedCount: number;
  role?: string;
  groupId?: string;
  categoryIds?: string[];
}

export interface JudgeGroup {
  id: string;
  programId: string;
  name: string;
  description?: string;
  createdAt?: string;
  judgeCount: number;
}

export interface JudgeRoundAssignment {
  submissionJudgeId: string;
  submissionId: string;
  submissionTitle: string;
  applicantName?: string;
  status: string;
}

export interface RoundJudgeScoreRow {
  id: string;
  name: string;
  email: string;
  assignedCount: number;
  completedCount: number;
  progress: number;
  assignments: JudgeRoundAssignment[];
}

export interface RoundJudgeScoreGroup {
  roundId: string;
  roundTitle: string;
  roundType: string;
  roundStatus: string;
  judges: RoundJudgeScoreRow[];
}


// Organization/team member (comes from `organization_members` + `profiles` + `roles`)
export interface TeamMember {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  roleId?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastActive: string;
  avatar: string;
  joinedDate: string;
  programScope?: 'organization' | 'program';
  programId?: string | null;
}

// Judging criterion definition
export interface JudgingCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  minScore: number;
  maxScore: number;
  sortOrder: number;
}

// A single criterion score submitted by a judge
export interface CriterionScore {
  criterionId: string;
  score: number;
  comment?: string;
}

// Display label for program status
export const programStatusLabel = (s: 'Active' | 'Draft' | 'Completed'): string =>
  ({ Active: 'Published', Draft: 'Draft', Completed: 'Closed' }[s] ?? s);



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

// Permission Definitions (must match `public.permissions.key` values)
// Contact represents a user/contact record used in the header and other UI surfaces.
export interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  avatar: string;
  source?: string;
  surveyAnswer?: string;
  joinedDate?: string;
}

export const PERMISSIONS = {
  VIEW_OVERVIEW: 'view_overview',
  MANAGE_PROGRAMS: 'manage_programs', // Schedule, Awards, Submission Setup
  VIEW_SUBMISSIONS: 'view_submissions',
  MANAGE_SUBMISSIONS: 'manage_submissions', // Accept/Reject/Delete
  VIEW_JUDGING: 'view_judging',
  MANAGE_JUDGING: 'manage_judging', // Assign judges, config
  MANAGE_FORMS: 'manage_forms',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_TEAMS: 'manage_teams', // Roles & Invites
  VIEW_LOGS: 'view_logs',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

