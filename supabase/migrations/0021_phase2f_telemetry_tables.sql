-- Phase 2F: Telemetry tables for RUM (web vitals) and error capture.

-- =========================================================================
-- error_events
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.error_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  url           text,
  user_agent    text,
  message       text NOT NULL,
  stack         text,
  digest        text,
  severity      text NOT NULL DEFAULT 'error' CHECK (severity IN ('error','warning','info')),
  release       text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_error_events_occurred_at ON public.error_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_organization_id ON public.error_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_error_events_user_id ON public.error_events (user_id);
CREATE INDEX IF NOT EXISTS idx_error_events_severity ON public.error_events (severity);

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS error_events_anyone_insert ON public.error_events;
CREATE POLICY error_events_anyone_insert ON public.error_events
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS error_events_admin_read ON public.error_events;
CREATE POLICY error_events_admin_read ON public.error_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

-- =========================================================================
-- performance_events (web-vitals beacon)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.performance_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  url           text,
  user_agent    text,
  metric_name   text NOT NULL CHECK (metric_name IN ('CLS','FCP','FID','INP','LCP','TTFB')),
  metric_value  double precision NOT NULL,
  rating        text CHECK (rating IN ('good','needs-improvement','poor')),
  navigation_type text,
  release       text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_performance_events_occurred_at ON public.performance_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_events_metric_name ON public.performance_events (metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_events_organization_id ON public.performance_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_events_user_id ON public.performance_events (user_id);

ALTER TABLE public.performance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS performance_events_anyone_insert ON public.performance_events;
CREATE POLICY performance_events_anyone_insert ON public.performance_events
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS performance_events_admin_read ON public.performance_events;
CREATE POLICY performance_events_admin_read ON public.performance_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

-- Grants for inserts from anon/authenticated
GRANT INSERT ON public.error_events TO anon, authenticated;
GRANT INSERT ON public.performance_events TO anon, authenticated;
GRANT SELECT ON public.error_events TO authenticated;
GRANT SELECT ON public.performance_events TO authenticated;
