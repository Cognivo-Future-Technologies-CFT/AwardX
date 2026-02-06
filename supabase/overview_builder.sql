-- =============================================
-- AMS Overview Page Configuration Schema
-- =============================================

-- 1. Program Page Configuration
-- Stores global settings for the program's landing page (theme, fonts, publish state)
CREATE TABLE public.program_page_configs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    program_id uuid NOT NULL UNIQUE,
    
    -- Theme & Design Settings
    theme_settings jsonb DEFAULT '{
        "primaryColor": "#6366f1",
        "secondaryColor": "#8b5cf6",
        "fontFamily": "Inter",
        "backgroundColor": "#ffffff",
        "backgroundImageUrl": null,
        "sectionSpacing": "medium"
    }'::jsonb,
    
    -- Publish Control
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    published_version integer DEFAULT 1,
    
    -- Metadata
    seo_title text,
    seo_description text,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT program_page_configs_pkey PRIMARY KEY (id),
    CONSTRAINT program_page_configs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.program_page_configs ENABLE ROW LEVEL SECURITY;

-- 2. Program Page Sections
-- Stores the dynamic blocks (Hero, About, Sponsors, etc.)
CREATE TABLE public.program_page_sections (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    program_id uuid NOT NULL,
    
    -- Core Section Fields
    section_type character varying NOT NULL, -- 'hero', 'about', 'timeline', 'categories', 'jury', 'sponsors', 'faq', 'cta', 'custom'
    title character varying,
    subtitle text,
    
    -- Content & Configuration
    content jsonb DEFAULT '{}'::jsonb, -- Flexible content storage (text, image URLs, video links)
    settings jsonb DEFAULT '{}'::jsonb, -- Section-specific layout settings (bg color, alignment)
    
    -- Ordering & Visibility
    sort_order integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT program_page_sections_pkey PRIMARY KEY (id),
    CONSTRAINT program_page_sections_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.program_page_sections ENABLE ROW LEVEL SECURITY;

-- 3. Program Sponsors / Partners
-- Dedicated table for sponsors management
CREATE TABLE public.program_sponsors (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    program_id uuid NOT NULL,
    
    name character varying NOT NULL,
    logo_url text,
    website_url text,
    
    -- Tiering
    tier character varying DEFAULT 'partner', -- 'title', 'gold', 'silver', 'media', 'partner'
    tier_label character varying, -- Custom label override
    
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT program_sponsors_pkey PRIMARY KEY (id),
    CONSTRAINT program_sponsors_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.program_sponsors ENABLE ROW LEVEL SECURITY;

-- 4. Program FAQs
-- Specific FAQs for this program overview page
CREATE TABLE public.program_faqs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    program_id uuid NOT NULL,
    
    question text NOT NULL,
    answer text NOT NULL,
    category character varying DEFAULT 'general',
    
    sort_order integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT program_faqs_pkey PRIMARY KEY (id),
    CONSTRAINT program_faqs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.program_faqs ENABLE ROW LEVEL SECURITY;

-- 5. Timeline Milestones (Extra Important Dates)
-- Distinct from 'Rounds' which are functional (have submissions). These are informational.
CREATE TABLE public.program_timeline_milestones (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    program_id uuid NOT NULL,
    
    title character varying NOT NULL,
    date timestamp with time zone,
    description text,
    icon character varying, -- Lucide icon name
    
    sort_order integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT program_timeline_milestones_pkey PRIMARY KEY (id),
    CONSTRAINT program_timeline_milestones_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.program_timeline_milestones ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_program_page_sections_program_id ON public.program_page_sections(program_id);
CREATE INDEX idx_program_page_sections_sort_order ON public.program_page_sections(sort_order);
CREATE INDEX idx_program_sponsors_program_id ON public.program_sponsors(program_id);
CREATE INDEX idx_program_faqs_program_id ON public.program_faqs(program_id);
