-- Phase 2C.1: storage buckets + RLS for client uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('client-uploads', 'client-uploads', false, 52428800, NULL),
  ('avatars', 'avatars', false, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('message-attachments', 'message-attachments', false, 26214400, NULL),
  ('contracts', 'contracts', false, 26214400, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS client_uploads_read ON storage.objects;
CREATE POLICY client_uploads_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-uploads' AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS client_uploads_write ON storage.objects;
CREATE POLICY client_uploads_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-uploads' AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS client_uploads_update ON storage.objects;
CREATE POLICY client_uploads_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-uploads' AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS client_uploads_delete ON storage.objects;
CREATE POLICY client_uploads_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-uploads' AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id::text = split_part(name, '/', 1)
        AND m.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS avatars_read ON storage.objects;
CREATE POLICY avatars_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_write ON storage.objects;
CREATE POLICY avatars_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1));

DROP POLICY IF EXISTS avatars_update ON storage.objects;
CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1));

DROP POLICY IF EXISTS avatars_delete ON storage.objects;
CREATE POLICY avatars_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1));

DROP POLICY IF EXISTS msg_attach_read ON storage.objects;
CREATE POLICY msg_attach_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments' AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS msg_attach_write ON storage.objects;
CREATE POLICY msg_attach_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments' AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS contracts_read ON storage.objects;
CREATE POLICY contracts_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts' AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id::text = split_part(name, '/', 1)
    )
  );

DROP VIEW IF EXISTS public.org_storage_usage;
CREATE VIEW public.org_storage_usage AS
SELECT
  split_part(o.name, '/', 1)::uuid AS organization_id,
  COALESCE(SUM((o.metadata->>'size')::bigint), 0) AS bytes_used,
  COUNT(*) AS object_count
FROM storage.objects o
WHERE o.bucket_id = 'client-uploads'
  AND o.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
GROUP BY split_part(o.name, '/', 1);

GRANT SELECT ON public.org_storage_usage TO authenticated;
