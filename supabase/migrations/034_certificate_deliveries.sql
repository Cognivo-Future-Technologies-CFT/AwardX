-- Certificate delivery tracking & verification
-- Stores a record per certificate sent; the verification_code is the public URL token.
-- No image is stored — certificates are rendered on-demand from metadata.

CREATE TABLE IF NOT EXISTS certificate_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  certificate_type text NOT NULL CHECK (certificate_type IN ('participation', 'round_advance', 'winner')),
  rounds_cleared integer NOT NULL DEFAULT 0,
  total_rounds integer NOT NULL DEFAULT 0,
  verification_code text NOT NULL UNIQUE,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cert_deliveries_program ON certificate_deliveries(program_id);
CREATE INDEX idx_cert_deliveries_submission ON certificate_deliveries(submission_id);
CREATE INDEX idx_cert_deliveries_code ON certificate_deliveries(verification_code);

-- RLS: program managers can read, public can verify by code
ALTER TABLE certificate_deliveries ENABLE ROW LEVEL SECURITY;

-- Org members of the program's org can SELECT
CREATE POLICY cert_deliveries_select ON certificate_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programs p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = certificate_deliveries.program_id
        AND om.user_id = auth.uid()
    )
  );

-- Service role handles inserts (server-side only)
