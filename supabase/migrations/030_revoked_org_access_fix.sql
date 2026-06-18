-- Fix: revoked org members still had access because profiles.organization_id
-- was treated as proof of membership in current_org_ids().
-- Access must require an active organization_members row.

CREATE OR REPLACE FUNCTION public.current_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid()
    AND om.organization_id IS NOT NULL
    AND coalesce(om.status, 'active') = 'active'
$$;

REVOKE ALL ON FUNCTION public.current_org_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.current_org_ids() TO authenticated, anon;
