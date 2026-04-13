-- =============================================================================
-- AwardX Migration Script #2
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Run AFTER script.sql — safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS)
-- =============================================================================

-- =============================================================================
-- 1. PAYMENT CONFIG — add secretKey storage to program_payment_configs
--    Needed for Razorpay integration (Key ID + Key Secret).
-- =============================================================================
ALTER TABLE public.program_payment_configs
  ADD COLUMN IF NOT EXISTS secret_key text;

-- Index for provider lookups on the separate payment configs table
CREATE INDEX IF NOT EXISTS idx_program_payment_configs_program_id
  ON public.program_payment_configs(program_id);


-- =============================================================================
-- 2. AUDIT LOGS — add indexes for date-range deletion and auto-cleanup
--    The new AuditLogsView supports:
--    • Auto-delete logs older than 7 days
--    • Delete by date range (start/end)
--    • Bulk delete by IDs
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at);

-- Partial index for unread notifications (used by mark-as-read)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(is_read)
  WHERE is_read = false;


-- =============================================================================
-- 3. FORM FIELDS — ensure we have field_key for label resolution
--    The SubmissionDetailModal now loads form fields to resolve UUID keys
--    to human-readable labels. Ensure field_key and label are indexed.
-- =============================================================================
ALTER TABLE public.program_form_fields
  ADD COLUMN IF NOT EXISTS field_key varchar;

CREATE INDEX IF NOT EXISTS idx_program_form_fields_form_id
  ON public.program_form_fields(form_id);

CREATE INDEX IF NOT EXISTS idx_program_form_fields_sort_order
  ON public.program_form_fields(form_id, sort_order);


-- =============================================================================
-- 4. PAYMENT FIELDS — support for payment form element
--    Track which forms have a payment field and its configuration.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.form_payment_configs (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  form_id       uuid        NOT NULL REFERENCES public.program_forms(id) ON DELETE CASCADE,
  field_id      varchar     NOT NULL,
  provider      varchar     NOT NULL DEFAULT 'Razorpay'
                  CHECK (provider IN ('Stripe', 'PayPal', 'Razorpay')),
  amount        numeric     NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency      varchar     NOT NULL DEFAULT 'INR',
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT form_payment_configs_pkey PRIMARY KEY (id),
  CONSTRAINT form_payment_configs_form_unique UNIQUE (form_id)
);

CREATE INDEX IF NOT EXISTS idx_form_payment_configs_form_id
  ON public.form_payment_configs(form_id);

-- RLS
ALTER TABLE public.form_payment_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_payment_configs_select" ON public.form_payment_configs;
CREATE POLICY "form_payment_configs_select"
  ON public.form_payment_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_forms pf
      JOIN   public.programs p ON p.id = pf.program_id
      WHERE  pf.id = form_payment_configs.form_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

DROP POLICY IF EXISTS "form_payment_configs_write" ON public.form_payment_configs;
CREATE POLICY "form_payment_configs_write"
  ON public.form_payment_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.program_forms pf
      JOIN   public.programs p ON p.id = pf.program_id
      WHERE  pf.id = form_payment_configs.form_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

-- Public read for the payment page (applicants need to see payment amount)
DROP POLICY IF EXISTS "form_payment_configs_public_read" ON public.form_payment_configs;
CREATE POLICY "form_payment_configs_public_read"
  ON public.form_payment_configs FOR SELECT
  USING (true);


-- =============================================================================
-- 5. RAZORPAY ORDERS — track payment orders for verification
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.razorpay_orders (
  id                uuid        NOT NULL DEFAULT uuid_generate_v4(),
  submission_id     uuid        REFERENCES public.submissions(id) ON DELETE SET NULL,
  program_id        uuid        NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  razorpay_order_id varchar     NOT NULL UNIQUE,
  razorpay_payment_id varchar,
  razorpay_signature  varchar,
  amount            numeric     NOT NULL,
  currency          varchar     NOT NULL DEFAULT 'INR',
  status            varchar     NOT NULL DEFAULT 'created'
                      CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  payer_email       varchar,
  payer_name        varchar,
  metadata          jsonb       DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz,
  CONSTRAINT razorpay_orders_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_razorpay_orders_program_id
  ON public.razorpay_orders(program_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_submission_id
  ON public.razorpay_orders(submission_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_status
  ON public.razorpay_orders(status);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_razorpay_order_id
  ON public.razorpay_orders(razorpay_order_id);

-- RLS
ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;

-- Org members can see all orders for their programs
DROP POLICY IF EXISTS "razorpay_orders_org" ON public.razorpay_orders;
CREATE POLICY "razorpay_orders_org"
  ON public.razorpay_orders FOR ALL
  USING (
    program_id IN (
      SELECT p.id FROM public.programs p
      WHERE  p.organization_id IN (SELECT current_org_ids())
    )
  );

-- Public insert for payment creation (applicant submitting payment)
DROP POLICY IF EXISTS "razorpay_orders_public_insert" ON public.razorpay_orders;
CREATE POLICY "razorpay_orders_public_insert"
  ON public.razorpay_orders FOR INSERT
  WITH CHECK (true);


-- =============================================================================
-- 6. ADDITIONAL PERMISSIONS
-- =============================================================================
INSERT INTO public.permissions (key, name, description, category)
VALUES
  ('manage_payments', 'Manage Payments', 'Configure payment providers and view transactions', 'Payments'),
  ('view_payments',   'View Payments',   'View payment transactions and order history',       'Payments')
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- Done! Summary of changes:
--
--  NEW TABLES:
--    • form_payment_configs   — per-form payment field configuration
--    • razorpay_orders        — Razorpay order tracking and verification
--
--  MODIFIED TABLES:
--    • program_payment_configs — added secret_key column
--    • program_form_fields     — added field_key column
--
--  NEW INDEXES:
--    • idx_audit_logs_created_at      — fast date-range queries for cleanup
--    • idx_notifications_unread       — fast unread notification lookups
--    • idx_program_form_fields_*      — fast field resolution
--    • idx_programs_payment_provider   — payment provider lookups
--
--  NEW PERMISSIONS:
--    • manage_payments, view_payments
--
--  RLS POLICIES added for all new tables.
-- =============================================================================
