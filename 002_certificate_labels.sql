-- Create the global round labels table
CREATE TABLE IF NOT EXISTS certificate_round_display_labels (
    program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    certificate_display_name text NOT NULL,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (program_id, round_id)
);

ALTER TABLE certificate_round_display_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON certificate_round_display_labels
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow public read access" ON certificate_round_display_labels
    FOR SELECT
    TO public
    USING (true);

-- Drop the old participant override table
DROP TABLE IF EXISTS certificate_participant_overrides CASCADE;
