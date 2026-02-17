-- Seed program_templates table with default round configurations
-- Based on peer-reviewed research and real-world award program best practices

-- Ensure event types exist (insert if missing, do nothing if exists)
INSERT INTO public.event_types (name, icon, description, category)
VALUES 
  ('Award', 'Trophy', 'Recognition programs for excellence in a field', 'Recognition'),
  ('Competition', 'Gavel', 'Competitive events with winners and rankings', 'Recognition'),
  ('Grant', 'HandCoins', 'Funding opportunities for projects and research', 'Funding'),
  ('Residency', 'Building2', 'Artist and creative residency programs', 'Opportunity'),
  ('Commission', 'Palette', 'Commissioning creative works and projects', 'Opportunity'),
  ('Exhibition', 'MapPin', 'Curated exhibition and showcase opportunities', 'Showcase'),
  ('Fair', 'Store', 'Art fair and marketplace booth selections', 'Showcase'),
  ('Internal Event', 'Briefcase', 'Internal organizational recognition', 'Recognition')
ON CONFLICT (name) DO NOTHING;

-- Delete existing templates before re-inserting (to allow clean re-runs)
DELETE FROM public.program_templates WHERE title IN (
  'Award Program', 'Competition', 'Grant Program', 'Residency Program', 
  'Commission Program', 'Exhibition Program', 'Art Fair', 'Internal Event'
);

-- Insert Award template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Award Program',
  'Recognition program for excellence. 3-5 reviewers per entry with blind review based on A'' Design Award and iF Design models.',
  'Trophy',
  (SELECT id FROM public.event_types WHERE name = 'Award'),
  '[
    {"title": "Submission Period", "type": "Submission", "description": "Open call for entries. Participants submit their work for consideration.", "startOffsetDays": -60, "durationDays": 60, "reviewerCount": null},
    {"title": "Preliminary Triage", "type": "Judging", "description": "Fast eligibility and quality gate. Eliminate bottom ~50% of entries.", "startOffsetDays": 0, "durationDays": 7, "reviewerCount": 3},
    {"title": "Detailed Scoring", "type": "Judging", "description": "Rubric-based evaluation by 3-5 assigned reviewers per entry. Anonymous blind review.", "startOffsetDays": 7, "durationDays": 14, "reviewerCount": 5},
    {"title": "Final Jury Deliberation", "type": "Judging", "description": "Full jury meeting for shortlisted entries. Discussion-based consensus for top awards.", "startOffsetDays": 21, "durationDays": 7, "reviewerCount": null},
    {"title": "Winner Announcement", "type": "Announcement", "description": "Public announcement of award winners and recognition.", "startOffsetDays": 28, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 5, "totalJuryPoolSize": 20, "blindReview": true, "scoreNormalization": true, "scoringScale": "1-7"}}'::jsonb,
  true,
  1
);

-- Insert Competition template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Competition',
  'Competitive event with multi-round knockout structure. Based on TIC Americas and SND Creative Competition models.',
  'Gavel',
  (SELECT id FROM public.event_types WHERE name = 'Competition'),
  '[
    {"title": "Submission Period", "type": "Submission", "description": "Open submissions for competition entries.", "startOffsetDays": -90, "durationDays": 90, "reviewerCount": null},
    {"title": "Preliminary Round", "type": "Judging", "description": "Eligibility check and initial scoring. Cut bottom ~60%.", "startOffsetDays": 0, "durationDays": 10, "reviewerCount": 3},
    {"title": "Semi-Final Round", "type": "Judging", "description": "Detailed rubric evaluation. 3-5 reviewers per entry. Advance top 20%.", "startOffsetDays": 10, "durationDays": 14, "reviewerCount": 5},
    {"title": "Final Round", "type": "Judging", "description": "Live presentations or deep review. Panel discussion and scoring.", "startOffsetDays": 24, "durationDays": 7, "reviewerCount": null},
    {"title": "Grand Final & Awards", "type": "Announcement", "description": "Final winners announced. Optional public showcase or ceremony.", "startOffsetDays": 31, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 5, "totalJuryPoolSize": 30, "blindReview": true, "scoreNormalization": true, "scoringScale": "1-10"}}'::jsonb,
  true,
  2
);

-- Insert Grant template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Grant Program',
  'Funding program with NIH-style 2-level peer review. 3-5 expert reviewers per application.',
  'HandCoins',
  (SELECT id FROM public.event_types WHERE name = 'Grant'),
  '[
    {"title": "Application Period", "type": "Submission", "description": "Grant applications and proposals open for submission.", "startOffsetDays": -120, "durationDays": 120, "reviewerCount": null},
    {"title": "Outline Triage", "type": "Judging", "description": "External assessors review proposals. Min 2-3 per application. ~50% discussed further.", "startOffsetDays": 0, "durationDays": 21, "reviewerCount": 3},
    {"title": "Expert Panel Review", "type": "Judging", "description": "Full committee meeting. Assigned reviewers present critiques. Panel scores on 1-10 scale.", "startOffsetDays": 21, "durationDays": 14, "reviewerCount": 5},
    {"title": "Ratification & Ranking", "type": "Judging", "description": "Advisory body reviews ranked list. Final funding decisions.", "startOffsetDays": 35, "durationDays": 7, "reviewerCount": null},
    {"title": "Award Notification", "type": "Announcement", "description": "Grant recipients notified and awards announced.", "startOffsetDays": 42, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 5, "totalJuryPoolSize": 25, "blindReview": false, "scoreNormalization": true, "scoringScale": "1-10"}}'::jsonb,
  true,
  3
);

-- Insert Residency template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Residency Program',
  'Artist residency selection with anonymous blind review. Based on MacDowell, Yaddo, and Skowhegan models.',
  'Building2',
  (SELECT id FROM public.event_types WHERE name = 'Residency'),
  '[
    {"title": "Application Period", "type": "Submission", "description": "Artists submit applications for residency consideration.", "startOffsetDays": -90, "durationDays": 90, "reviewerCount": null},
    {"title": "Initial Jury Scoring", "type": "Judging", "description": "Blind review. 3 jurors per application score independently based on work quality.", "startOffsetDays": 0, "durationDays": 14, "reviewerCount": 3},
    {"title": "Panel Shortlist", "type": "Judging", "description": "Full panel convenes to discuss top-scored applications. Consensus building.", "startOffsetDays": 14, "durationDays": 7, "reviewerCount": null},
    {"title": "Finalist Interviews", "type": "Judging", "description": "Optional interviews with shortlisted candidates for competitive programs.", "startOffsetDays": 21, "durationDays": 7, "reviewerCount": null},
    {"title": "Selection Announcement", "type": "Announcement", "description": "Selected artists notified and residency placements confirmed.", "startOffsetDays": 28, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 5, "totalJuryPoolSize": 10, "blindReview": true, "scoreNormalization": true, "scoringScale": "1-7"}}'::jsonb,
  true,
  4
);

-- Insert Commission template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Commission Program',
  'RFQ/RFP-based commissioning process. Based on US public art program standards.',
  'Palette',
  (SELECT id FROM public.event_types WHERE name = 'Commission'),
  '[
    {"title": "RFQ Period", "type": "Submission", "description": "Request for Qualifications. Artists submit portfolios and credentials.", "startOffsetDays": -60, "durationDays": 30, "reviewerCount": null},
    {"title": "Proposal Triage", "type": "Judging", "description": "Review qualifications and portfolios. Shortlist 3-5 finalists.", "startOffsetDays": -30, "durationDays": 14, "reviewerCount": null},
    {"title": "RFP Period", "type": "Submission", "description": "Shortlisted artists submit full proposals.", "startOffsetDays": -16, "durationDays": 16, "reviewerCount": null},
    {"title": "Detailed Scoring", "type": "Judging", "description": "Rubric-based evaluation on feasibility, merit, and budget.", "startOffsetDays": 0, "durationDays": 10, "reviewerCount": 5},
    {"title": "Pitch & Final Decision", "type": "Judging", "description": "Live presentations + Q&A. Panel votes on final selection.", "startOffsetDays": 10, "durationDays": 7, "reviewerCount": null},
    {"title": "Artist Selection", "type": "Announcement", "description": "Commissioned artist announced and contract negotiations begin.", "startOffsetDays": 17, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 5, "totalJuryPoolSize": 10, "blindReview": false, "scoreNormalization": true, "scoringScale": "1-7"}}'::jsonb,
  true,
  5
);

-- Insert Exhibition template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Exhibition Program',
  'Curated exhibition selection. Based on Venice Biennale, London Biennale, and ZAPP models.',
  'MapPin',
  (SELECT id FROM public.event_types WHERE name = 'Exhibition'),
  '[
    {"title": "Open Call", "type": "Submission", "description": "Artists submit work for exhibition consideration.", "startOffsetDays": -60, "durationDays": 60, "reviewerCount": null},
    {"title": "Fast Triage", "type": "Judging", "description": "Digital review. Eligibility and basic quality gate. Cut ~40%.", "startOffsetDays": 0, "durationDays": 7, "reviewerCount": null},
    {"title": "Curatorial Scoring", "type": "Judging", "description": "Full jury scores on rubric (1-10 scale). Discussion for borderline entries.", "startOffsetDays": 7, "durationDays": 14, "reviewerCount": 5},
    {"title": "Final Programming", "type": "Judging", "description": "Curatorial team assembles final exhibition from top-scored works.", "startOffsetDays": 21, "durationDays": 7, "reviewerCount": null},
    {"title": "Artist Notification", "type": "Announcement", "description": "Selected artists notified and exhibition details finalized.", "startOffsetDays": 28, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 5, "totalJuryPoolSize": 12, "blindReview": true, "scoreNormalization": true, "scoringScale": "1-10"}}'::jsonb,
  true,
  6
);

-- Insert Fair template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Art Fair',
  'Booth selection for art fairs. Based on ZAPP standards for lighter-touch jurying.',
  'Store',
  (SELECT id FROM public.event_types WHERE name = 'Fair'),
  '[
    {"title": "Application Period", "type": "Submission", "description": "Artists apply for booth space at the fair.", "startOffsetDays": -45, "durationDays": 45, "reviewerCount": null},
    {"title": "Eligibility Review", "type": "Judging", "description": "Verify medium, check image quality. Score 1-7. Cut bottom 40%.", "startOffsetDays": 0, "durationDays": 7, "reviewerCount": 3},
    {"title": "Curated Selection", "type": "Judging", "description": "Final scoring 1-5. Balance medium mix and booth diversity.", "startOffsetDays": 7, "durationDays": 7, "reviewerCount": 4},
    {"title": "Booth Assignments", "type": "Announcement", "description": "Accepted artists notified and booth assignments made.", "startOffsetDays": 14, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 4, "totalJuryPoolSize": 8, "blindReview": true, "scoreNormalization": false, "scoringScale": "1-7"}}'::jsonb,
  true,
  7
);

-- Insert Internal Event template
INSERT INTO public.program_templates (title, description, icon, event_type_id, default_rounds, default_criteria, is_active, sort_order)
VALUES (
  'Internal Event',
  'Internal organizational recognition. Simplified structure for corporate awards and hackathons.',
  'Briefcase',
  (SELECT id FROM public.event_types WHERE name = 'Internal Event'),
  '[
    {"title": "Submission Period", "type": "Submission", "description": "Team members submit entries for internal recognition.", "startOffsetDays": -30, "durationDays": 30, "reviewerCount": null},
    {"title": "Committee Scoring", "type": "Judging", "description": "Committee scores all entries on simplified rubric.", "startOffsetDays": 0, "durationDays": 7, "reviewerCount": 3},
    {"title": "Leadership Review", "type": "Judging", "description": "Senior leaders ratify or adjust final selections.", "startOffsetDays": 7, "durationDays": 3, "reviewerCount": null},
    {"title": "Award Ceremony", "type": "Announcement", "description": "Winners announced at internal event or ceremony.", "startOffsetDays": 10, "durationDays": 1, "reviewerCount": null}
  ]'::jsonb,
  '{"judgingConfig": {"minReviewersPerEntry": 3, "idealReviewersPerEntry": 4, "totalJuryPoolSize": 6, "blindReview": false, "scoreNormalization": false, "scoringScale": "1-5"}}'::jsonb,
  true,
  8
);
