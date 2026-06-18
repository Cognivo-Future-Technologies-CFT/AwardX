-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  category character varying,
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
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
  program_id uuid,
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT roles_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
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
  program_id uuid,
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT organization_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id),
  CONSTRAINT organization_members_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.event_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  icon character varying,
  description text,
  category character varying,
  CONSTRAINT event_types_pkey PRIMARY KEY (id)
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
  active_form_id uuid,
  kyc_enabled boolean DEFAULT false,
  kyc_provider character varying DEFAULT 'didit'::character varying,
  application_mode character varying DEFAULT 'standard'::character varying CHECK (application_mode::text = ANY (ARRAY['standard'::character varying, 'hackathon'::character varying]::text[])),
  require_github_auth boolean DEFAULT false,
  integration_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT programs_pkey PRIMARY KEY (id),
  CONSTRAINT programs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT programs_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.event_types(id),
  CONSTRAINT programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT programs_active_form_id_fkey FOREIGN KEY (active_form_id) REFERENCES public.program_forms(id)
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
  provider_account_id text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_key text,
  CONSTRAINT program_payment_configs_pkey PRIMARY KEY (id),
  CONSTRAINT program_payment_configs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
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
  advancement_criteria jsonb DEFAULT '{"type": "all_pass"}'::jsonb,
  advancement_trigger character varying DEFAULT 'manual'::character varying,
  is_finalized boolean DEFAULT false,
  CONSTRAINT rounds_pkey PRIMARY KEY (id),
  CONSTRAINT rounds_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
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
  votes_count integer DEFAULT 0,
  search_vector tsvector,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT submissions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT submissions_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.profiles(id)
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
  program_id uuid,
  invite_token uuid DEFAULT uuid_generate_v4() UNIQUE,
  invite_token_used_at timestamp with time zone,
  role character varying,
  CONSTRAINT judges_pkey PRIMARY KEY (id),
  CONSTRAINT judges_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT judges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT judges_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
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
CREATE TABLE public.submission_judges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  judge_id uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  status character varying DEFAULT 'pending'::character varying,
  completed_at timestamp with time zone,
  round_id uuid,
  CONSTRAINT submission_judges_pkey PRIMARY KEY (id),
  CONSTRAINT submission_judges_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT submission_judges_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.judges(id),
  CONSTRAINT submission_judges_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id),
  CONSTRAINT submission_judges_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id)
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
CREATE TABLE public.contact_custom_fields (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  contact_id uuid,
  field_name character varying NOT NULL,
  field_value text,
  CONSTRAINT contact_custom_fields_pkey PRIMARY KEY (id),
  CONSTRAINT contact_custom_fields_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
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
CREATE TABLE public.round_edges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  source_round_id uuid NOT NULL,
  target_round_id uuid NOT NULL,
  condition jsonb DEFAULT '{"type": "always"}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  source_handle character varying,
  target_handle character varying,
  data_stream character varying,
  name character varying,
  CONSTRAINT round_edges_pkey PRIMARY KEY (id),
  CONSTRAINT round_edges_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT round_edges_source_round_id_fkey FOREIGN KEY (source_round_id) REFERENCES public.rounds(id),
  CONSTRAINT round_edges_target_round_id_fkey FOREIGN KEY (target_round_id) REFERENCES public.rounds(id)
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
  program_id uuid,
  expires_at timestamp with time zone,
  CONSTRAINT organization_invites_pkey PRIMARY KEY (id),
  CONSTRAINT organization_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_invites_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT organization_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id),
  CONSTRAINT organization_invites_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
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
  allow_multiple_nominations boolean NOT NULL DEFAULT false,
  max_nominations_per_person integer NOT NULL DEFAULT 1 CHECK (max_nominations_per_person >= 1),
  auto_accept_submissions boolean NOT NULL DEFAULT true,
  CONSTRAINT program_forms_pkey PRIMARY KEY (id),
  CONSTRAINT program_forms_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
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
  field_key character varying,
  CONSTRAINT program_form_fields_pkey PRIMARY KEY (id),
  CONSTRAINT program_form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.program_forms(id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.program_page_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL UNIQUE,
  theme_settings jsonb DEFAULT '{}'::jsonb,
  meta_title text,
  meta_description text,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  seo_title text,
  seo_description text,
  published_version integer DEFAULT 1,
  CONSTRAINT program_page_configs_pkey PRIMARY KEY (id),
  CONSTRAINT program_page_configs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.program_page_sections (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  section_type text NOT NULL,
  title text,
  content jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subtitle text,
  is_draft boolean DEFAULT false,
  CONSTRAINT program_page_sections_pkey PRIMARY KEY (id),
  CONSTRAINT program_page_sections_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.program_sponsors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  name text NOT NULL,
  logo_url text,
  website_url text,
  tier text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tier_label text,
  is_active boolean DEFAULT true,
  CONSTRAINT program_sponsors_pkey PRIMARY KEY (id),
  CONSTRAINT program_sponsors_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.program_faqs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_visible boolean DEFAULT true,
  CONSTRAINT program_faqs_pkey PRIMARY KEY (id),
  CONSTRAINT program_faqs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.public_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  user_id uuid,
  ip_address character varying,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  round_id uuid,
  voter_name text,
  voter_email text,
  CONSTRAINT public_votes_pkey PRIMARY KEY (id),
  CONSTRAINT public_votes_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT public_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT public_votes_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id)
);
CREATE TABLE public.round_transitions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  round_id uuid,
  from_status character varying,
  to_status character varying,
  triggered_by character varying,
  triggered_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT round_transitions_pkey PRIMARY KEY (id),
  CONSTRAINT round_transitions_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id)
);
CREATE TABLE public.winner_announcements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid,
  submission_id uuid,
  rank integer,
  tier character varying,
  final_score numeric,
  judge_score numeric,
  public_votes integer,
  announced_at timestamp with time zone DEFAULT now(),
  announced_by uuid,
  is_published boolean DEFAULT false,
  CONSTRAINT winner_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT winner_announcements_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT winner_announcements_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT winner_announcements_announced_by_fkey FOREIGN KEY (announced_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.program_timeline_milestones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  title text NOT NULL,
  date text,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_timeline_milestones_pkey PRIMARY KEY (id),
  CONSTRAINT program_timeline_milestones_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.submission_drafts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  draft_data jsonb DEFAULT '{}'::jsonb,
  current_page integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submission_drafts_pkey PRIMARY KEY (id),
  CONSTRAINT submission_drafts_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.program_forms(id),
  CONSTRAINT submission_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.program_workflow_extensions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  extension_id text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0'::text,
  config jsonb DEFAULT '{}'::jsonb,
  installed_at timestamp with time zone DEFAULT now(),
  installed_by uuid,
  CONSTRAINT program_workflow_extensions_pkey PRIMARY KEY (id),
  CONSTRAINT program_workflow_extensions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT program_workflow_extensions_installed_by_fkey FOREIGN KEY (installed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_workspace_state (
  user_id uuid NOT NULL,
  active_program_id uuid,
  current_view character varying DEFAULT 'overview'::character varying,
  sidebar_collapsed boolean DEFAULT false,
  selected_form_ids jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_workspace_state_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_workspace_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_workspace_state_active_program_id_fkey FOREIGN KEY (active_program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.judging_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL UNIQUE,
  scoring_system character varying DEFAULT 'numeric'::character varying,
  pass_threshold integer DEFAULT 70,
  blind_judging boolean DEFAULT false,
  allow_comments boolean DEFAULT true,
  auto_assign boolean DEFAULT false,
  max_judges_per_submission integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT judging_config_pkey PRIMARY KEY (id),
  CONSTRAINT judging_config_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.slug_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  old_slug character varying NOT NULL,
  new_slug character varying NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  changed_by uuid,
  CONSTRAINT slug_history_pkey PRIMARY KEY (id),
  CONSTRAINT slug_history_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT slug_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.form_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  event_type character varying NOT NULL,
  user_id uuid,
  session_id text,
  page_reached integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT form_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT form_analytics_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.program_forms(id),
  CONSTRAINT form_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  program_id uuid,
  recipient_user_id uuid,
  type text NOT NULL DEFAULT 'system'::text,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT notifications_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.invite_request_traces (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  path text NOT NULL,
  url text NOT NULL,
  method character varying NOT NULL DEFAULT 'POST'::character varying CHECK (method::text = 'POST'::text),
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  started_at timestamp with time zone NOT NULL,
  finished_at timestamp with time zone NOT NULL,
  http_status integer,
  ok boolean NOT NULL DEFAULT false,
  error_message text,
  request_body jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invite_request_traces_pkey PRIMARY KEY (id),
  CONSTRAINT invite_request_traces_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT invite_request_traces_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.round_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  round_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'advanced'::character varying, 'eliminated'::character varying]::text[])),
  source_round_id uuid,
  carried_score numeric,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  advanced_at timestamp with time zone,
  eliminated_at timestamp with time zone,
  elimination_reason text,
  CONSTRAINT round_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT round_submissions_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT round_submissions_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT round_submissions_source_round_id_fkey FOREIGN KEY (source_round_id) REFERENCES public.rounds(id)
);
CREATE TABLE public.voting_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  round_id uuid NOT NULL UNIQUE,
  votes_per_user integer NOT NULL DEFAULT 5 CHECK (votes_per_user > 0),
  votes_per_submission integer NOT NULL DEFAULT 1 CHECK (votes_per_submission > 0),
  require_auth boolean NOT NULL DEFAULT false,
  allow_anonymous boolean NOT NULL DEFAULT true,
  show_results_publicly boolean NOT NULL DEFAULT false,
  show_leaderboard boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  public_voting_slug character varying,
  access_mode character varying DEFAULT 'open'::character varying CHECK (access_mode::text = ANY (ARRAY['open'::character varying, 'org_only'::character varying, 'authenticated'::character varying]::text[])),
  CONSTRAINT voting_configs_pkey PRIMARY KEY (id),
  CONSTRAINT voting_configs_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id)
);
CREATE TABLE public.advancement_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  round_id uuid NOT NULL,
  target_round_id uuid,
  program_id uuid,
  trigger_type character varying NOT NULL DEFAULT 'manual'::character varying CHECK (trigger_type::text = ANY (ARRAY['manual'::character varying, 'automatic'::character varying, 'override'::character varying]::text[])),
  criteria_used jsonb DEFAULT '{}'::jsonb,
  advanced_count integer DEFAULT 0,
  eliminated_count integer DEFAULT 0,
  had_ties boolean DEFAULT false,
  notes text,
  executed_by uuid,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  status character varying DEFAULT 'completed'::character varying,
  total_participants integer DEFAULT 0,
  tie_resolution jsonb,
  CONSTRAINT advancement_events_pkey PRIMARY KEY (id),
  CONSTRAINT advancement_events_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT advancement_events_target_round_id_fkey FOREIGN KEY (target_round_id) REFERENCES public.rounds(id),
  CONSTRAINT advancement_events_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT advancement_events_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.advancement_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  advancement_event_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  outcome character varying NOT NULL CHECK (outcome::text = ANY (ARRAY['advanced'::character varying, 'eliminated'::character varying, 'held'::character varying, 'override'::character varying]::text[])),
  rank integer,
  score numeric,
  was_at_cutoff_boundary boolean DEFAULT false,
  override_reason text,
  vote_count integer DEFAULT 0,
  CONSTRAINT advancement_details_pkey PRIMARY KEY (id),
  CONSTRAINT advancement_details_advancement_event_id_fkey FOREIGN KEY (advancement_event_id) REFERENCES public.advancement_events(id),
  CONSTRAINT advancement_details_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.judge_groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  name character varying NOT NULL,
  label character varying,
  color character varying DEFAULT '#6366f1'::character varying,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  CONSTRAINT judge_groups_pkey PRIMARY KEY (id),
  CONSTRAINT judge_groups_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.judge_group_members (
  group_id uuid NOT NULL,
  judge_id uuid NOT NULL,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT judge_group_members_pkey PRIMARY KEY (group_id, judge_id),
  CONSTRAINT judge_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.judge_groups(id),
  CONSTRAINT judge_group_members_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.judges(id)
);
CREATE TABLE public.form_payment_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL UNIQUE,
  field_id character varying NOT NULL,
  provider character varying NOT NULL DEFAULT 'Razorpay'::character varying CHECK (provider::text = ANY (ARRAY['Stripe'::character varying, 'PayPal'::character varying, 'Razorpay'::character varying]::text[])),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0::numeric),
  currency character varying NOT NULL DEFAULT 'INR'::character varying,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT form_payment_configs_pkey PRIMARY KEY (id),
  CONSTRAINT form_payment_configs_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.program_forms(id)
);
CREATE TABLE public.razorpay_orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  program_id uuid NOT NULL,
  razorpay_order_id character varying NOT NULL UNIQUE,
  razorpay_payment_id character varying,
  razorpay_signature character varying,
  amount numeric NOT NULL,
  currency character varying NOT NULL DEFAULT 'INR'::character varying,
  status character varying NOT NULL DEFAULT 'created'::character varying CHECK (status::text = ANY (ARRAY['created'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying]::text[])),
  payer_email character varying,
  payer_name character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  CONSTRAINT razorpay_orders_pkey PRIMARY KEY (id),
  CONSTRAINT razorpay_orders_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT razorpay_orders_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.organization_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  provider character varying NOT NULL CHECK (provider::text = ANY (ARRAY['resend'::character varying, 'didit'::character varying]::text[])),
  api_key_encrypted text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected boolean NOT NULL DEFAULT false,
  connected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organization_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT organization_integrations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.integration_connect_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  provider character varying NOT NULL CHECK (provider::text = ANY (ARRAY['razorpay'::character varying, 'resend'::character varying]::text[])),
  state character varying NOT NULL UNIQUE,
  program_id uuid,
  step character varying NOT NULL DEFAULT 'started'::character varying,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT integration_connect_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT integration_connect_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT integration_connect_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT integration_connect_sessions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.kyc_verifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  user_id uuid NOT NULL,
  provider character varying NOT NULL DEFAULT 'didit'::character varying,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'verified'::character varying, 'failed'::character varying, 'expired'::character varying]::text[])),
  provider_session_id character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kyc_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT kyc_verifications_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT kyc_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.judge_category_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  judge_id uuid NOT NULL,
  category_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT judge_category_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT judge_category_assignments_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.judges(id),
  CONSTRAINT judge_category_assignments_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);