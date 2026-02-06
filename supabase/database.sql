-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  action character varying NOT NULL,
  action_type character varying NOT NULL,
  resource_type character varying,
  resource_id uuid,
  details text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  user_name character varying,
  user_avatar text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.campaign_templates (
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
CREATE TABLE public.case_studies (
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
  stats jsonb DEFAULT '[]'::jsonb,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT case_studies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
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
CREATE TABLE public.contact_custom_fields (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  contact_id uuid,
  field_name character varying NOT NULL,
  field_value text,
  CONSTRAINT contact_custom_fields_pkey PRIMARY KEY (id),
  CONSTRAINT contact_custom_fields_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  avatar_url text,
  source character varying,
  survey_answer text,
  tags ARRAY,
  status character varying DEFAULT 'active'::character varying,
  last_active_at timestamp with time zone,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.event_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  icon character varying,
  description text,
  category character varying,
  CONSTRAINT event_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  question text NOT NULL,
  answer text NOT NULL,
  category character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT faqs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.features (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  icon character varying,
  color character varying,
  items jsonb DEFAULT '[]'::jsonb,
  category character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT features_pkey PRIMARY KEY (id)
);
CREATE TABLE public.how_it_works_steps (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  step_number integer NOT NULL,
  title character varying NOT NULL,
  description text,
  icon character varying,
  items jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT how_it_works_steps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.judge_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_judge_id uuid UNIQUE,
  overall_comment text,
  private_notes text,
  recommendation character varying,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT judge_comments_pkey PRIMARY KEY (id),
  CONSTRAINT judge_comments_submission_judge_id_fkey FOREIGN KEY (submission_judge_id) REFERENCES public.submission_judges(id)
);
CREATE TABLE public.judges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  name character varying NOT NULL,
  email character varying NOT NULL,
  avatar_url text,
  bio text,
  status character varying DEFAULT 'invited'::character varying,
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  assigned_count integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  CONSTRAINT judges_pkey PRIMARY KEY (id),
  CONSTRAINT judges_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT judges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.judging_criteria (
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
CREATE TABLE public.message_threads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  subject character varying,
  thread_type character varying DEFAULT 'direct'::character varying,
  related_submission_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_threads_pkey PRIMARY KEY (id),
  CONSTRAINT message_threads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT message_threads_related_submission_id_fkey FOREIGN KEY (related_submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid,
  sender_id uuid,
  content text NOT NULL,
  is_system_message boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  sent_at timestamp with time zone DEFAULT now(),
  sender_name character varying,
  sender_avatar text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.organization_invites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  email character varying NOT NULL,
  role_id uuid,
  invited_by uuid,
  status character varying DEFAULT 'pending'::character varying,
  token uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  CONSTRAINT organization_invites_pkey PRIMARY KEY (id),
  CONSTRAINT organization_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_invites_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT organization_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  user_id uuid,
  role_id uuid,
  status character varying DEFAULT 'active'::character varying,
  invited_by uuid,
  invited_at timestamp with time zone,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT organization_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  logo_url text,
  website character varying,
  industry character varying,
  plan character varying DEFAULT 'starter'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  category character varying,
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pricing_tiers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  price_monthly numeric,
  price_yearly numeric,
  price_display character varying,
  description text,
  features jsonb DEFAULT '[]'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  is_recommended boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pricing_tiers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  organization_id uuid,
  full_name character varying,
  avatar_url text,
  phone character varying,
  timezone character varying DEFAULT 'UTC'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  email character varying,
  job_title character varying,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.program_form_fields (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  label character varying NOT NULL,
  type character varying NOT NULL,
  required boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_form_fields_pkey PRIMARY KEY (id),
  CONSTRAINT program_form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.program_forms(id)
);
CREATE TABLE public.program_forms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  form_type character varying DEFAULT 'submission'::character varying,
  is_active boolean DEFAULT true,
  pages jsonb DEFAULT '[]'::jsonb,
  theme jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_forms_pkey PRIMARY KEY (id),
  CONSTRAINT program_forms_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.program_payment_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid UNIQUE,
  enabled boolean DEFAULT false,
  provider character varying DEFAULT 'stripe'::character varying,
  currency character varying DEFAULT 'USD'::character varying,
  fee_amount numeric DEFAULT 0,
  fee_type character varying DEFAULT 'fixed'::character varying,
  public_key text,
  secret_key_encrypted text,
  webhook_secret_encrypted text,
  connected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_payment_configs_pkey PRIMARY KEY (id),
  CONSTRAINT program_payment_configs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.program_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  icon character varying,
  cover_image_url text,
  industry_category character varying,
  event_type_id uuid,
  default_categories jsonb DEFAULT '[]'::jsonb,
  default_rounds jsonb DEFAULT '[]'::jsonb,
  default_criteria jsonb DEFAULT '[]'::jsonb,
  default_form_fields jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_templates_pkey PRIMARY KEY (id),
  CONSTRAINT program_templates_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.event_types(id)
);
CREATE TABLE public.programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  title character varying NOT NULL,
  slug character varying,
  description text,
  cover_image_url text,
  industry_category character varying,
  event_type_id uuid,
  status character varying DEFAULT 'draft'::character varying,
  visibility character varying DEFAULT 'public'::character varying,
  deadline timestamp with time zone,
  timezone character varying DEFAULT 'UTC'::character varying,
  entries_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT programs_pkey PRIMARY KEY (id),
  CONSTRAINT programs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT programs_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.event_types(id),
  CONSTRAINT programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  name character varying NOT NULL,
  description text,
  color character varying DEFAULT 'bg-slate-100 text-slate-700'::character varying,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  permissions ARRAY DEFAULT ARRAY[]::text[],
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.round_edges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  source_round_id uuid NOT NULL,
  target_round_id uuid NOT NULL,
  condition jsonb DEFAULT '{"type": "always"}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT round_edges_pkey PRIMARY KEY (id),
  CONSTRAINT round_edges_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT round_edges_source_round_id_fkey FOREIGN KEY (source_round_id) REFERENCES public.rounds(id),
  CONSTRAINT round_edges_target_round_id_fkey FOREIGN KEY (target_round_id) REFERENCES public.rounds(id)
);
CREATE TABLE public.rounds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  title character varying NOT NULL,
  description text,
  type character varying NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status character varying DEFAULT 'upcoming'::character varying,
  sort_order integer DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rounds_pkey PRIMARY KEY (id),
  CONSTRAINT rounds_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.scheduled_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  program_id uuid,
  content text NOT NULL,
  image_url text,
  link_url text,
  platforms ARRAY NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  trigger_type character varying DEFAULT 'manual'::character varying,
  status character varying DEFAULT 'scheduled'::character varying,
  posted_at timestamp with time zone,
  error_message text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduled_posts_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_posts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT scheduled_posts_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT scheduled_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.scores (
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
CREATE TABLE public.social_accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  platform character varying NOT NULL,
  platform_user_id character varying,
  handle character varying,
  avatar_url text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  status character varying DEFAULT 'connected'::character varying,
  connected_at timestamp with time zone DEFAULT now(),
  CONSTRAINT social_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT social_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.submission_files (
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
CREATE TABLE public.submission_judges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  judge_id uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  status character varying DEFAULT 'pending'::character varying,
  completed_at timestamp with time zone,
  CONSTRAINT submission_judges_pkey PRIMARY KEY (id),
  CONSTRAINT submission_judges_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT submission_judges_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.judges(id),
  CONSTRAINT submission_judges_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  category_id uuid,
  applicant_id uuid,
  title character varying NOT NULL,
  description text,
  cover_image_url text,
  status character varying DEFAULT 'pending'::character varying,
  average_score numeric,
  total_scores integer DEFAULT 0,
  payment_status character varying DEFAULT 'pending'::character varying,
  payment_amount numeric,
  payment_id character varying,
  submission_data jsonb DEFAULT '{}'::jsonb,
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  applicant_name character varying,
  applicant_email character varying,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT submissions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT submissions_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.testimonials (
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
CREATE TABLE public.thread_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid,
  user_id uuid,
  last_read_at timestamp with time zone,
  is_archived boolean DEFAULT false,
  CONSTRAINT thread_participants_pkey PRIMARY KEY (id),
  CONSTRAINT thread_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id),
  CONSTRAINT thread_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.use_cases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  category character varying,
  description text,
  icon character varying,
  gradient character varying,
  image_url text,
  stats jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT use_cases_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_settings (
  user_id uuid NOT NULL,
  notifications jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);