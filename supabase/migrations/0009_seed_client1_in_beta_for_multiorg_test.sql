-- Phase 2B.3 test data: ensure client1+test is a member of Beta Test Co (in addition to Acme) so the multi-org switcher e2e test can drive the dropdown. Idempotent.
INSERT INTO public.org_memberships (organization_id, user_id, role)
SELECT o.id, u.id, 'member'
FROM public.organizations o, public.app_users u
WHERE o.slug = 'beta-test-co'
  AND u.email = 'client1+test@sageideas.org'
  AND NOT EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.organization_id = o.id AND m.user_id = u.id
  );
