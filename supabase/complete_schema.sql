-- ============================================================================
-- COMPLETE AWARDX SUPABASE DATABASE SCHEMA
-- Generated from provided schema with all tables and relationships
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Organizations (Multi-tenant container)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  logo_url text,
  website character varying,
  industry character varying,
  plan character varying DEFAULT 'starter',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  organization_id uuid,
  full_name character varying,
  avatar_url text,
  phone character varying,
  timezone character varying DEFAULT 'UTC',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL
);

-- Event Types
CREATE TABLE IF NOT EXISTS public.event_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  icon character varying,
  description text,
  category character varying,
  CONSTRAINT event_types_pkey PRIMARY KEY (id)
);

-- Programs
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  title character varying NOT NULL,
  slug character varying,
  description text,
  cover_image_url text,
  industry_category character varying,
  event_type_id uuid,
  status character varying DEFAULT 'draft',
  visibility character varying DEFAULT 'public',
  deadline timestamp with time zone,
  timezone character varying DEFAULT 'UTC',
  entries_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT programs_pkey PRIMARY KEY (id),
  CONSTRAINT programs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT programs_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.event_types(id),
  CONSTRAINT programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  parent_id uuid,
  title character varying NOT NULL,
  description text,
  icon character varying,
  color character varying,
  sort_order integer DEFAULT 0,
  entries_count integer DEFAULT 0,
  max_entries integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);

-- Rounds
CREATE TABLE IF NOT EXISTS public.rounds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  title character varying NOT NULL,
  description text,
  type character varying NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status character varying DEFAULT 'upcoming',
  sort_order integer DEFAULT 0,
  settings jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rounds_pkey PRIMARY KEY (id),
  CONSTRAINT rounds_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);

-- Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  category_id uuid,
  applicant_id uuid,
  title character varying NOT NULL,
  description text,
  cover_image_url text,
  status character varying DEFAULT 'pending',
  average_score numeric,
  total_scores integer DEFAULT 0,
  payment_status character varying DEFAULT 'pending',
  payment_amount numeric,
  payment_id character varying,
  submission_data jsonb DEFAULT '{}',
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  applicant_name character varying,
  applicant_email character varying,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT submissions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT submissions_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.profiles(id)
);

-- Submission Files
CREATE TABLE IF NOT EXISTS public.submission_files (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  file_name character varying NOT NULL,
  file_url text NOT NULL,
  file_type character varying,
  file_size integer,
  sort_order integer DEFAULT 0,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submission_files_pkey PRIMARY KEY (id),
  CONSTRAINT submission_files_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);

-- Judges
CREATE TABLE IF NOT EXISTS public.judges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  name character varying NOT NULL,
  email character varying NOT NULL,
  avatar_url text,
  bio text,
  status character varying DEFAULT 'invited',
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  assigned_count integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  CONSTRAINT judges_pkey PRIMARY KEY (id),
  CONSTRAINT judges_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT judges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Submission Judges
CREATE TABLE IF NOT EXISTS public.submission_judges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  judge_id uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  status character varying DEFAULT 'pending',
  completed_at timestamp with time zone,
  CONSTRAINT submission_judges_pkey PRIMARY KEY (id),
  CONSTRAINT submission_judges_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT submission_judges_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.judges(id),
  CONSTRAINT submission_judges_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id)
);

-- Judging Criteria
CREATE TABLE IF NOT EXISTS public.judging_criteria (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  name character varying NOT NULL,
  description text,
  weight integer DEFAULT 100,
  min_score integer DEFAULT 0,
  max_score integer DEFAULT 10,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT judging_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT judging_criteria_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);

-- Scores
CREATE TABLE IF NOT EXISTS public.scores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_judge_id uuid,
  criterion_id uuid,
  score integer NOT NULL,
  comment text,
  scored_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scores_pkey PRIMARY KEY (id),
  CONSTRAINT scores_submission_judge_id_fkey FOREIGN KEY (submission_judge_id) REFERENCES public.submission_judges(id),
  CONSTRAINT scores_criterion_id_fkey FOREIGN KEY (criterion_id) REFERENCES public.judging_criteria(id)
);

-- Judge Comments
CREATE TABLE IF NOT EXISTS public.judge_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_judge_id uuid UNIQUE,
  overall_comment text,
  private_notes text,
  recommendation character varying,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT judge_comments_pkey PRIMARY KEY (id),
  CONSTRAINT judge_comments_submission_judge_id_fkey FOREIGN KEY (submission_judge_id) REFERENCES public.submission_judges(id)
);

-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================

-- Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  category character varying,
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

-- Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  name character varying NOT NULL,
  description text,
  color character varying DEFAULT 'bg-slate-100 text-slate-700',
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
);

-- Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  role_id uuid,
  status character varying DEFAULT 'active',
  invited_by uuid,
  invited_at timestamp with time zone,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT organization_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id)
);

-- ============================================================================
-- CRM & MESSAGING
-- ============================================================================

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  avatar_url text,
  source character varying,
  survey_answer text,
  tags text[],
  status character varying DEFAULT 'active',
  last_active_at timestamp with time zone,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Contact Custom Fields
CREATE TABLE IF NOT EXISTS public.contact_custom_fields (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  contact_id uuid,
  field_name character varying NOT NULL,
  field_value text,
  CONSTRAINT contact_custom_fields_pkey PRIMARY KEY (id),
  CONSTRAINT contact_custom_fields_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);

-- Message Threads
CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  subject character varying,
  thread_type character varying DEFAULT 'direct',
  related_submission_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_threads_pkey PRIMARY KEY (id),
  CONSTRAINT message_threads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT message_threads_related_submission_id_fkey FOREIGN KEY (related_submission_id) REFERENCES public.submissions(id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid,
  sender_id uuid,
  content text NOT NULL,
  is_system_message boolean DEFAULT false,
  attachments jsonb DEFAULT '[]',
  sent_at timestamp with time zone DEFAULT now(),
  sender_name character varying,
  sender_avatar text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);

-- Thread Participants
CREATE TABLE IF NOT EXISTS public.thread_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid,
  user_id uuid,
  last_read_at timestamp with time zone,
  is_archived boolean DEFAULT false,
  CONSTRAINT thread_participants_pkey PRIMARY KEY (id),
  CONSTRAINT thread_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id),
  CONSTRAINT thread_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- ============================================================================
-- MARKETING & SOCIAL
-- ============================================================================

-- Social Accounts
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  platform character varying NOT NULL,
  platform_user_id character varying,
  handle character varying,
  avatar_url text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  status character varying DEFAULT 'connected',
  connected_at timestamp with time zone DEFAULT now(),
  CONSTRAINT social_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT social_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Scheduled Posts
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  program_id uuid,
  content text NOT NULL,
  image_url text,
  link_url text,
  platforms text[] NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  trigger_type character varying DEFAULT 'manual',
  status character varying DEFAULT 'scheduled',
  posted_at timestamp with time zone,
  error_message text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduled_posts_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_posts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT scheduled_posts_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT scheduled_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Campaign Templates
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  title character varying NOT NULL,
  description text,
  content text NOT NULL,
  icon character varying,
  color character varying,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT campaign_templates_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

-- Program Payment Configs
CREATE TABLE IF NOT EXISTS public.program_payment_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid UNIQUE,
  enabled boolean DEFAULT false,
  provider character varying DEFAULT 'stripe',
  currency character varying DEFAULT 'USD',
  fee_amount numeric DEFAULT 0,
  fee_type character varying DEFAULT 'fixed',
  public_key text,
  secret_key_encrypted text,
  webhook_secret_encrypted text,
  connected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_payment_configs_pkey PRIMARY KEY (id),
  CONSTRAINT program_payment_configs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);

-- ============================================================================
-- CMS / MARKETING CONTENT (Public)
-- ============================================================================

-- Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  role character varying,
  company character varying,
  content text NOT NULL,
  avatar_url text,
  rating integer DEFAULT 5,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT testimonials_pkey PRIMARY KEY (id)
);

-- Pricing Tiers
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  price_monthly numeric,
  price_yearly numeric,
  price_display character varying,
  description text,
  features jsonb DEFAULT '[]',
  limits jsonb DEFAULT '{}',
  is_recommended boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pricing_tiers_pkey PRIMARY KEY (id)
);

-- Features
CREATE TABLE IF NOT EXISTS public.features (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  icon character varying,
  color character varying,
  items jsonb DEFAULT '[]',
  category character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT features_pkey PRIMARY KEY (id)
);

-- Use Cases
CREATE TABLE IF NOT EXISTS public.use_cases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  category character varying,
  description text,
  icon character varying,
  gradient character varying,
  image_url text,
  stats jsonb DEFAULT '[]',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT use_cases_pkey PRIMARY KEY (id)
);

-- How It Works Steps
CREATE TABLE IF NOT EXISTS public.how_it_works_steps (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  step_number integer NOT NULL,
  title character varying NOT NULL,
  description text,
  icon character varying,
  items jsonb DEFAULT '[]',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT how_it_works_steps_pkey PRIMARY KEY (id)
);

-- Case Studies
CREATE TABLE IF NOT EXISTS public.case_studies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  industry character varying,
  company_name character varying,
  company_logo_url text,
  cover_image_url text,
  color character varying,
  challenge text,
  solution text,
  results text,
  quote text,
  quote_author character varying,
  quote_author_role character varying,
  stats jsonb DEFAULT '[]',
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT case_studies_pkey PRIMARY KEY (id)
);

-- FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  question text NOT NULL,
  answer text NOT NULL,
  category character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT faqs_pkey PRIMARY KEY (id)
);

-- Program Templates
CREATE TABLE IF NOT EXISTS public.program_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  icon character varying,
  cover_image_url text,
  industry_category character varying,
  event_type_id uuid,
  default_categories jsonb DEFAULT '[]',
  default_rounds jsonb DEFAULT '[]',
  default_criteria jsonb DEFAULT '[]',
  default_form_fields jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_templates_pkey PRIMARY KEY (id),
  CONSTRAINT program_templates_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.event_types(id)
);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  action character varying NOT NULL,
  action_type character varying NOT NULL,
  resource_type character varying,
  resource_id uuid,
  details text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  user_name character varying,
  user_avatar text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_programs_organization_id ON public.programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON public.programs(status);
CREATE INDEX IF NOT EXISTS idx_submissions_program_id ON public.submissions(program_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submission_judges_submission_id ON public.submission_judges(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_judges_judge_id ON public.submission_judges(judge_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see data from their organization)
-- Note: These are basic policies. You should customize them based on your security requirements.

-- Profiles: Users can see their own profile and profiles in their organization
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Organizations: Users can see organizations they belong to
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Programs: Users can see programs from their organization
CREATE POLICY "Users can view programs in their organization" ON public.programs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_threads_updated_at BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (Optional seed data)
-- ============================================================================

-- Seed default permissions
INSERT INTO public.permissions (key, name, description, category) VALUES
  ('view_overview', 'View Overview', 'View dashboard statistics and overview', 'Dashboard'),
  ('manage_programs', 'Manage Programs', 'Create, edit, delete programs and schedules', 'Programs'),
  ('view_submissions', 'View Submissions', 'View all submissions', 'Submissions'),
  ('manage_submissions', 'Manage Submissions', 'Accept, reject, delete submissions', 'Submissions'),
  ('view_judging', 'View Judging', 'View judging panels and scores', 'Judging'),
  ('manage_judging', 'Manage Judging', 'Assign judges, configure judging criteria', 'Judging'),
  ('manage_forms', 'Manage Forms', 'Edit submission and registration forms', 'Forms'),
  ('view_messages', 'View Messages', 'View inbox and message threads', 'Communication'),
  ('manage_reach', 'Manage Reach', 'Manage social accounts and campaigns', 'Marketing'),
  ('view_analytics', 'View Analytics', 'Access analytics and reports', 'Analytics'),
  ('manage_crm', 'Manage CRM', 'Manage contacts and segments', 'CRM'),
  ('manage_teams', 'Manage Teams', 'Manage team members, roles, and invites', 'Administration'),
  ('view_logs', 'View Logs', 'View audit logs and activity history', 'Administration'),
  ('manage_settings', 'Manage Settings', 'Access organization settings', 'Administration')
ON CONFLICT (key) DO NOTHING;


