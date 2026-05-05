/**
 * Phase 31 — seed/upsert the 23 document templates into contract_templates.
 *
 * Idempotent: matches by slug. Run with:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-templates.ts
 */

import { createClient } from '@supabase/supabase-js';
import { SEED_TEMPLATES } from '../lib/templates/seed';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const t of SEED_TEMPLATES) {
    const payload = {
      slug: t.slug,
      title: t.title,
      category: t.category,
      body_md: t.body_md,
      variables: t.variables,
      active: true,
    };

    const { data: existing, error: lookupError } = await sb
      .from('contract_templates')
      .select('id, version')
      .eq('slug', t.slug)
      .maybeSingle();

    if (lookupError) {
      console.error(`[lookup] ${t.slug}:`, lookupError.message);
      failed++;
      continue;
    }

    if (existing) {
      const { error } = await sb
        .from('contract_templates')
        .update({ ...payload, version: (existing.version ?? 1) + 1 })
        .eq('id', existing.id);
      if (error) {
        console.error(`[update] ${t.slug}:`, error.message);
        failed++;
      } else {
        updated++;
        console.log(`[update] ${t.slug}`);
      }
    } else {
      const { error } = await sb.from('contract_templates').insert(payload);
      if (error) {
        console.error(`[insert] ${t.slug}:`, error.message);
        failed++;
      } else {
        inserted++;
        console.log(`[insert] ${t.slug}`);
      }
    }
  }

  console.log(`\nDone — inserted: ${inserted}, updated: ${updated}, failed: ${failed}`);

  const { count } = await sb
    .from('contract_templates')
    .select('id', { count: 'exact', head: true });
  console.log(`Total contract_templates rows: ${count ?? '?'}`);

  if (failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
