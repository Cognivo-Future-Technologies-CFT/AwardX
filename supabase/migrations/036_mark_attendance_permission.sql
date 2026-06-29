-- Add mark_attendance permission used by Teams & Roles and the Attendance dashboard view.
INSERT INTO public.permissions (key, name, description, category)
VALUES (
  'mark_attendance',
  'Mark Attendance',
  'Scan QR passes and manage event attendance check-in',
  'Submissions'
)
ON CONFLICT (key) DO NOTHING;
