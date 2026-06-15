-- Fix slug_history RLS: add INSERT/UPDATE/DELETE policy for org members.

DROP POLICY IF EXISTS slug_history_read ON public.slug_history;

CREATE POLICY slug_history_org_access ON public.slug_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = slug_history.program_id
        AND p.organization_id IN (SELECT public.current_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = slug_history.program_id
        AND p.organization_id IN (SELECT public.current_org_ids())
    )
  );
