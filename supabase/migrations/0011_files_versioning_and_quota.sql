ALTER TABLE public.files ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.files(id);
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT true;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_files_parent ON public.files (parent_id);
CREATE INDEX IF NOT EXISTS idx_files_engagement_latest ON public.files (engagement_id, is_latest) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_org_latest ON public.files (organization_id, is_latest) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_org_storage_quota()
RETURNS trigger AS $$
DECLARE
  v_org uuid;
  v_used bigint;
  v_limit bigint := 5368709120;
BEGIN
  IF NEW.bucket_id <> 'client-uploads' THEN
    RETURN NEW;
  END IF;
  v_org := NULLIF(split_part(NEW.name, '/', 1), '')::uuid;
  IF v_org IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO v_used
  FROM storage.objects
  WHERE bucket_id = 'client-uploads'
    AND split_part(name, '/', 1)::text = v_org::text;
  IF v_used + COALESCE((NEW.metadata->>'size')::bigint, 0) > v_limit THEN
    RAISE EXCEPTION 'Org storage quota exceeded (5 GB) for organization %', v_org
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_org_storage_quota ON storage.objects;
CREATE TRIGGER trg_org_storage_quota
  BEFORE INSERT ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_org_storage_quota();

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS files_org_read ON public.files;
CREATE POLICY files_org_read ON public.files FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.organization_id = files.organization_id
    )
  );

DROP POLICY IF EXISTS files_org_insert ON public.files;
CREATE POLICY files_org_insert ON public.files FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.organization_id = files.organization_id
    )
  );

DROP POLICY IF EXISTS files_org_update ON public.files;
CREATE POLICY files_org_update ON public.files FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.organization_id = files.organization_id
    )
  );
