-- Phase 2F: Recreate org_storage_usage view WITHOUT SECURITY DEFINER
-- (security_invoker=true ensures the view runs with caller's permissions).
-- Source: Supabase security advisor (security_definer_view).

DROP VIEW IF EXISTS public.org_storage_usage;
CREATE VIEW public.org_storage_usage
WITH (security_invoker = true)
AS
SELECT split_part(name, '/'::text, 1)::uuid AS organization_id,
       COALESCE(sum((metadata ->> 'size'::text)::bigint), 0::numeric) AS bytes_used,
       count(*) AS object_count
  FROM storage.objects o
 WHERE bucket_id = 'client-uploads'::text
   AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'::text
 GROUP BY split_part(name, '/'::text, 1);

GRANT SELECT ON public.org_storage_usage TO authenticated, service_role;

-- Harden enforce_org_storage_quota: pin search_path so SECURITY DEFINER
-- function cannot be hijacked by malicious schemas in the caller's path.
-- Source: Supabase security advisor (function_search_path_mutable).
ALTER FUNCTION public.enforce_org_storage_quota() SET search_path = public, pg_temp;
