begin;

CREATE TABLE if not exists public.program_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    email CHARACTER VARYING NOT NULL,
    name CHARACTER VARYING NOT NULL,
    qr_code_token UUID NOT NULL DEFAULT gen_random_uuid(),
    status CHARACTER VARYING NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent')),
    marked_at TIMESTAMP WITH TIME ZONE,
    marked_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(program_id, email),
    UNIQUE(qr_code_token)
);

CREATE INDEX if not exists idx_program_attendance_program_id ON public.program_attendance(program_id);
CREATE INDEX if not exists idx_program_attendance_qr_code_token ON public.program_attendance(qr_code_token);

ALTER TABLE public.program_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY program_attendance_org_member_rw ON public.program_attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.id = program_attendance.program_id
      AND p.organization_id IN (SELECT public.current_org_ids())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.id = program_attendance.program_id
      AND p.organization_id IN (SELECT public.current_org_ids())
  )
);

commit;
