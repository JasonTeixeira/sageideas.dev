// RLS isolation tests for Sage Ideas Studio.
// Uses Supabase REST (PostgREST) directly with the anon key — verifies that an
// unauthenticated client cannot read or write protected tables.
//
// Run: node tests/rls/run.mjs

import { loadRlsTestConfig } from './config.mjs';

const { supabaseUrl: SUPABASE_URL, anonKey: ANON_KEY } = loadRlsTestConfig();

const BASE = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const READ_TABLES = [
  'profiles',
  'engagements',
  'invoices',
  'messages',
  'audit_log',
  'time_entries',
  'revenue_worker_jobs',
  'revenue_worker_attempts',
  'revenue_worker_dead_letters',
  'revenue_connector_import_batches',
  'revenue_connector_provenance',
  'revenue_website_audit_evidence',
  'revenue_website_audit_offer_mappings',
  'revenue_ai_draft_versions',
  'revenue_ai_evidence_citations',
  'revenue_ai_quality_gates',
  'revenue_email_safety_reports',
  'revenue_email_domain_health',
  'revenue_suppression_events',
  'revenue_sequence_stop_events',
  'revenue_inbox_runs',
  'revenue_inbox_threads',
  'revenue_inbox_messages',
  'revenue_inbox_classifications',
  'revenue_inbox_action_suggestions',
  'revenue_workspaces',
  'revenue_workspace_members',
  'revenue_workspace_configs',
  'revenue_workspace_usage',
  'revenue_workspace_billing_boundaries',
  'revenue_workspace_audit_logs',
  'revenue_api_keys',
  'revenue_api_requests',
  'revenue_api_ingestion_events',
  'revenue_api_webhook_events',
  'revenue_ml_feature_snapshots',
  'revenue_ml_outcome_labels',
  'revenue_ml_model_versions',
  'revenue_ml_scoring_decisions',
  'revenue_ml_calibration_reports',
  'revenue_compliance_records',
  'revenue_privacy_requests',
  'revenue_governance_reports',
  'revenue_ops_health_snapshots',
  'revenue_ops_ci_proofs',
  'revenue_ops_load_smokes',
  'revenue_institutional_program_runs',
  'revenue_live_integration_checks',
  'revenue_worker_runtime_executions',
  'revenue_observability_slo_snapshots',
  'revenue_privacy_workflow_jobs',
  'revenue_client_surface_proofs',
  'revenue_deliverability_audits',
  'revenue_load_scale_proofs',
  'revenue_ai_ml_eval_harness_runs',
  'opportunity_unified_items',
  'opportunity_proof_assets',
  'opportunity_communication_events',
  'opportunity_follow_up_queue',
  'opportunity_outcome_events',
  'opportunity_strategy_recommendations',
  'opportunity_load_proofs',
  'opportunity_readiness_audits',
  'traffic_sources',
  'traffic_campaigns',
  'traffic_landing_pages',
  'traffic_content_assets',
  'traffic_distribution_posts',
  'traffic_seo_keywords',
  'traffic_events',
  'traffic_conversions',
  'traffic_discord_invites',
  'traffic_growth_experiments',
  'traffic_next_best_actions',
  'traffic_weekly_reports',
  'traffic_load_proofs',
  'traffic_readiness_audits',
  'traffic_live_analytics_proofs',
  'traffic_campaign_launches',
  'traffic_revenue_feed_events',
];

const WRITE_TABLES = [
  { table: 'profiles', payload: { email: 'fake@example.com', full_name: 'Fake' } },
  { table: 'engagements', payload: { name: 'Fake Engagement', client_id: '00000000-0000-0000-0000-000000000000' } },
  { table: 'invoices', payload: { engagement_id: '00000000-0000-0000-0000-000000000000', amount_cents: 1 } },
  { table: 'contracts', payload: { engagement_id: '00000000-0000-0000-0000-000000000000', body: 'fake' } },
  {
    table: 'revenue_worker_jobs',
    payload: {
      run_key: 'anon-rls-test',
      job_kind: 'lead_source',
      target: 'blocked',
      status: 'queued',
    },
  },
  {
    table: 'revenue_worker_attempts',
    payload: {
      run_key: 'anon-rls-test',
      attempt_number: 1,
      status: 'failed',
      error_code: 'blocked',
      error_message: 'anon write should be blocked',
    },
  },
  {
    table: 'revenue_worker_dead_letters',
    payload: {
      run_key: 'anon-rls-test',
      job_kind: 'lead_source',
      target: 'blocked',
      error_code: 'blocked',
      error_message: 'anon write should be blocked',
    },
  },
  {
    table: 'revenue_connector_import_batches',
    payload: {
      run_key: 'anon-rls-test',
      batch_key: 'anon-rls-test:batch',
      connector_key: 'blocked',
      connector_label: 'Blocked connector',
      connector_type: 'lead',
      source_type: 'csv',
      status: 'completed',
    },
  },
  {
    table: 'revenue_connector_provenance',
    payload: {
      run_key: 'anon-rls-test',
      connector_key: 'blocked',
      record_type: 'lead',
      dedupe_key: 'blocked',
      source_url: 'https://blocked.example',
      discovered_at: new Date().toISOString(),
    },
  },
  {
    table: 'opportunity_unified_items',
    payload: {
      run_key: 'anon-rls-test',
      source: 'job_os',
      source_id: 'blocked',
      title: 'Blocked opportunity',
      organization: 'Blocked',
      stage: 'new',
    },
  },
  {
    table: 'opportunity_proof_assets',
    payload: {
      run_key: 'anon-rls-test',
      asset_type: 'artifact',
      title: 'Blocked asset',
      applies_to: 'both',
      gap_covered: 'blocked',
      priority: 'high',
    },
  },
  {
    table: 'opportunity_communication_events',
    payload: {
      run_key: 'anon-rls-test',
      source: 'revenue_os',
      source_id: 'blocked',
      channel: 'email',
      direction: 'inbound',
      intent: 'unknown',
    },
  },
  {
    table: 'opportunity_follow_up_queue',
    payload: {
      run_key: 'anon-rls-test',
      source: 'job_os',
      action: 'Blocked action',
      rationale: 'Anon write should be blocked',
      urgency: 'high',
    },
  },
  {
    table: 'opportunity_outcome_events',
    payload: {
      run_key: 'anon-rls-test',
      source: 'job_os',
      source_id: 'blocked',
      outcome: 'reply',
    },
  },
  {
    table: 'opportunity_strategy_recommendations',
    payload: {
      run_key: 'anon-rls-test',
      recommendation: 'Blocked recommendation',
      rationale: 'Anon write should be blocked',
    },
  },
  {
    table: 'opportunity_load_proofs',
    payload: {
      run_key: 'anon-rls-test',
      status: 'passed',
    },
  },
  {
    table: 'opportunity_readiness_audits',
    payload: {
      run_key: 'anon-rls-test',
      score: 1,
      grade: 'blocked',
    },
  },
  {
    table: 'traffic_sources',
    payload: { run_key: 'anon-rls-test', source_key: 'seo', label: 'Blocked', status: 'active', audience: 'blocked' },
  },
  {
    table: 'traffic_campaigns',
    payload: { run_key: 'anon-rls-test', campaign_key: 'blocked', name: 'Blocked', primary_channel: 'seo', intent: 'lead_magnet', landing_page: '/blocked', utm_campaign: 'blocked' },
  },
  {
    table: 'traffic_landing_pages',
    payload: { run_key: 'anon-rls-test', path: '/blocked', page_type: 'tool', primary_cta: 'Blocked', target_conversion: 'blocked' },
  },
  {
    table: 'traffic_content_assets',
    payload: { run_key: 'anon-rls-test', asset_key: 'blocked', title: 'Blocked', asset_type: 'blog', target_url: '/blocked', topic: 'blocked', status: 'ready' },
  },
  {
    table: 'traffic_distribution_posts',
    payload: { run_key: 'anon-rls-test', asset_key: 'blocked', channel: 'linkedin', post_angle: 'Blocked', cta_url: '/blocked' },
  },
  {
    table: 'traffic_seo_keywords',
    payload: { run_key: 'anon-rls-test', keyword: 'blocked', intent: 'lead_magnet', target_url: '/blocked' },
  },
  {
    table: 'traffic_events',
    payload: { run_key: 'anon-rls-test', source: 'seo', url: '/blocked', event_type: 'visit', event_count: 1 },
  },
  {
    table: 'traffic_conversions',
    payload: { run_key: 'anon-rls-test', source: 'seo', landing_page: '/blocked', conversion_type: 'seo_audit', conversion_count: 1 },
  },
  {
    table: 'traffic_discord_invites',
    payload: { run_key: 'anon-rls-test', server_key: 'blocked', invite_code: 'blocked', source: 'discord', target_audience: 'blocked' },
  },
  {
    table: 'traffic_growth_experiments',
    payload: { run_key: 'anon-rls-test', name: 'Blocked', channel: 'seo', hypothesis: 'Blocked', metric: 'conversion_rate' },
  },
  {
    table: 'traffic_next_best_actions',
    payload: { run_key: 'anon-rls-test', channel: 'seo', action: 'Blocked', rationale: 'Blocked', expected_impact: 'Blocked', urgency: 'high' },
  },
  {
    table: 'traffic_weekly_reports',
    payload: { run_key: 'anon-rls-test', visits: 1, conversions: 1 },
  },
  {
    table: 'traffic_load_proofs',
    payload: { run_key: 'anon-rls-test', status: 'passed' },
  },
  {
    table: 'traffic_readiness_audits',
    payload: { run_key: 'anon-rls-test', score: 1, grade: 'blocked' },
  },
  {
    table: 'traffic_live_analytics_proofs',
    payload: { run_key: 'anon-rls-test', provider: 'ga4', evidence: 'blocked' },
  },
  {
    table: 'traffic_campaign_launches',
    payload: { run_key: 'anon-rls-test', campaign_key: 'blocked', channel: 'seo' },
  },
  {
    table: 'traffic_revenue_feed_events',
    payload: {
      run_key: 'anon-rls-test',
      campaign_key: 'blocked',
      source: 'seo',
      account_name: 'Blocked',
      recommended_offer: 'seo_conversion_audit',
      evidence: 'blocked',
    },
  },
  {
    table: 'revenue_website_audit_evidence',
    payload: {
      run_key: 'anon-rls-test',
      source_url: 'https://blocked.example',
      evidence_key: 'blocked',
      evidence_type: 'seo_check',
      status: 'failed',
      severity: 'high',
      label: 'Blocked',
      detail: 'anon write should be blocked',
      observed_at: new Date().toISOString(),
    },
  },
  {
    table: 'revenue_website_audit_offer_mappings',
    payload: {
      run_key: 'anon-rls-test',
      source_url: 'https://blocked.example',
      audit_score: 50,
      recommended_offer: 'seo_conversion_audit',
      close_probability_lift: 10,
      next_action: 'anon write should be blocked',
    },
  },
  {
    table: 'revenue_ai_draft_versions',
    payload: {
      run_key: 'anon-rls-test',
      provider: 'local_structured',
      model: 'blocked',
      prompt_version: 'blocked',
      subject: 'Blocked',
      body: 'anon write should be blocked',
      brand_voice: 'blocked',
    },
  },
  {
    table: 'revenue_ai_evidence_citations',
    payload: {
      run_key: 'anon-rls-test',
      evidence_id: 'blocked',
      claim: 'anon write should be blocked',
    },
  },
  {
    table: 'revenue_ai_quality_gates',
    payload: {
      run_key: 'anon-rls-test',
      gate_key: 'blocked',
      status: 'fail',
      severity: 'high',
      detail: 'anon write should be blocked',
    },
  },
  {
    table: 'revenue_email_safety_reports',
    payload: {
      run_key: 'anon-rls-test',
      domain: 'blocked.example',
      status: 'healthy',
    },
  },
  {
    table: 'revenue_email_domain_health',
    payload: {
      run_key: 'anon-rls-test',
      domain: 'blocked.example',
      status: 'healthy',
    },
  },
  {
    table: 'revenue_suppression_events',
    payload: {
      run_key: 'anon-rls-test',
      email: 'blocked@example.com',
      reason: 'manual_suppression',
      source: 'operator',
      occurred_at: new Date().toISOString(),
    },
  },
  {
    table: 'revenue_sequence_stop_events',
    payload: {
      run_key: 'anon-rls-test',
      sequence_key: 'blocked-sequence',
      reason: 'reply_received',
      occurred_at: new Date().toISOString(),
    },
  },
  {
    table: 'revenue_inbox_runs',
    payload: {
      run_key: 'anon-rls-test',
      provider: 'gmail',
      status: 'completed',
    },
  },
  {
    table: 'revenue_inbox_threads',
    payload: {
      run_key: 'anon-rls-test',
      thread_key: 'blocked-thread',
      provider: 'gmail',
      status: 'open',
    },
  },
  {
    table: 'revenue_inbox_messages',
    payload: {
      run_key: 'anon-rls-test',
      thread_key: 'blocked-thread',
      external_message_id: 'blocked-message',
      direction: 'inbound',
    },
  },
  {
    table: 'revenue_inbox_classifications',
    payload: {
      run_key: 'anon-rls-test',
      thread_key: 'blocked-thread',
      external_message_id: 'blocked-message',
      intent: 'neutral',
      sentiment: 'neutral',
    },
  },
  {
    table: 'revenue_inbox_action_suggestions',
    payload: {
      run_key: 'anon-rls-test',
      action_type: 'reply_follow_up',
      suggestion: 'anon write should be blocked',
    },
  },
  {
    table: 'revenue_workspaces',
    payload: {
      run_key: 'anon-rls-test',
      tenant_key: 'anon-blocked',
      business_name: 'Blocked Tenant',
      owner_email: 'owner@blocked.example',
    },
  },
  {
    table: 'revenue_workspace_members',
    payload: {
      tenant_key: 'anon-blocked',
      email: 'member@blocked.example',
      role: 'owner',
    },
  },
  {
    table: 'revenue_workspace_configs',
    payload: {
      tenant_key: 'anon-blocked',
      icp: { blocked: true },
    },
  },
  {
    table: 'revenue_workspace_usage',
    payload: {
      tenant_key: 'anon-blocked',
      period_start: '2026-06-01',
      period_end: '2026-06-30',
    },
  },
  {
    table: 'revenue_workspace_billing_boundaries',
    payload: {
      tenant_key: 'anon-blocked',
      plan_key: 'client_starter',
      billing_status: 'trial',
    },
  },
  {
    table: 'revenue_workspace_audit_logs',
    payload: {
      tenant_key: 'anon-blocked',
      action: 'blocked',
      entity_type: 'workspace',
    },
  },
  {
    table: 'revenue_api_keys',
    payload: {
      tenant_key: 'anon-blocked',
      name: 'Blocked API key',
      key_hash: 'blocked',
      key_prefix: 'blocked',
      last_four: '0000',
      scopes: ['leads:write'],
    },
  },
  {
    table: 'revenue_api_requests',
    payload: {
      tenant_key: 'anon-blocked',
      endpoint: '/api/revenue-os/v1/leads',
      method: 'POST',
      status_code: 202,
    },
  },
  {
    table: 'revenue_api_ingestion_events',
    payload: {
      tenant_key: 'anon-blocked',
      resource_type: 'lead',
      payload: { blocked: true },
    },
  },
  {
    table: 'revenue_api_webhook_events',
    payload: {
      tenant_key: 'anon-blocked',
      provider: 'blocked',
      event_type: 'blocked',
      signature_status: 'missing',
    },
  },
  {
    table: 'revenue_ml_feature_snapshots',
    payload: {
      tenant_id: 'anon-blocked',
      source: 'blocked',
      industry: 'blocked',
      offer: 'blocked',
      rule_score: 50,
      features: { blocked: true },
    },
  },
  {
    table: 'revenue_ml_outcome_labels',
    payload: {
      tenant_id: 'anon-blocked',
      outcome: 'no_reply',
    },
  },
  {
    table: 'revenue_ml_model_versions',
    payload: {
      tenant_id: 'anon-blocked',
      model_version: 'blocked-v1',
      sample_size: 1,
    },
  },
  {
    table: 'revenue_ml_scoring_decisions',
    payload: {
      tenant_id: 'anon-blocked',
      model_version: 'blocked-v1',
      rule_score: 50,
      learned_score: 50,
      blended_score: 50,
      calibrated_probability: 0.5,
      decision: 'review',
    },
  },
  {
    table: 'revenue_ml_calibration_reports',
    payload: {
      tenant_id: 'anon-blocked',
      model_version: 'blocked-v1',
      brier_score: 0.25,
    },
  },
  {
    table: 'revenue_compliance_records',
    payload: {
      tenant_key: 'anon-blocked',
      contact_email: 'blocked@example.com',
      source: 'blocked',
      consent_basis: 'legitimate_interest',
      business_context: 'anon write should be blocked',
    },
  },
  {
    table: 'revenue_privacy_requests',
    payload: {
      tenant_key: 'anon-blocked',
      request_type: 'suppress',
      subject_email: 'blocked@example.com',
      due_at: new Date().toISOString(),
    },
  },
  {
    table: 'revenue_governance_reports',
    payload: {
      tenant_key: 'anon-blocked',
      status: 'blocked',
      score: 0,
    },
  },
  {
    table: 'revenue_ops_health_snapshots',
    payload: {
      run_key: 'anon-rls-test',
      status: 'fail',
      score: 0,
    },
  },
  {
    table: 'revenue_ops_ci_proofs',
    payload: {
      run_key: 'anon-rls-test',
      ready: false,
      score: 0,
    },
  },
  {
    table: 'revenue_ops_load_smokes',
    payload: {
      run_key: 'anon-rls-test',
      passed: false,
      score: 0,
    },
  },
  {
    table: 'revenue_institutional_program_runs',
    payload: {
      run_key: 'anon-rls-test',
      program_key: '13_clean_pr_remote_ci',
      program_name: 'Clean PR + Remote CI Proof',
      status: 'blocked',
      score: 0,
    },
  },
  {
    table: 'revenue_live_integration_checks',
    payload: {
      run_key: 'anon-rls-test',
      provider: 'resend',
      mode: 'missing',
    },
  },
  {
    table: 'revenue_worker_runtime_executions',
    payload: {
      run_key: 'anon-rls-test',
      worker_id: 'blocked-worker',
      status: 'blocked',
    },
  },
  {
    table: 'revenue_observability_slo_snapshots',
    payload: {
      run_key: 'anon-rls-test',
      status: 'blocked',
      score: 0,
    },
  },
  {
    table: 'revenue_privacy_workflow_jobs',
    payload: {
      run_key: 'anon-rls-test',
      tenant_key: 'anon-blocked',
      request_type: 'suppress',
      subject_email: 'blocked@example.com',
      status: 'queued',
    },
  },
  {
    table: 'revenue_client_surface_proofs',
    payload: {
      run_key: 'anon-rls-test',
      tenant_key: 'anon-blocked',
      surface: 'client_dashboard',
      role: 'client_admin',
      status: 'blocked',
    },
  },
  {
    table: 'revenue_deliverability_audits',
    payload: {
      run_key: 'anon-rls-test',
      sending_domain: 'blocked.example',
      status: 'not_configured',
    },
  },
  {
    table: 'revenue_load_scale_proofs',
    payload: {
      run_key: 'anon-rls-test',
      status: 'blocked',
    },
  },
  {
    table: 'revenue_ai_ml_eval_harness_runs',
    payload: {
      run_key: 'anon-rls-test',
      eval_suite: 'blocked',
      model_version: 'blocked',
      prompt_version: 'blocked',
      status: 'blocked',
      score: 0,
    },
  },
];

let pass = 0;
let fail = 0;
const failures = [];

function ok(msg) {
  pass += 1;
  console.log(`  PASS  ${msg}`);
}

function bad(msg) {
  fail += 1;
  failures.push(msg);
  console.log(`  FAIL  ${msg}`);
}

async function readBlocked(table) {
  // Anon read: RLS should either return empty, 401, or 403.
  // A non-empty array means data leaked.
  const url = `${BASE}/${table}?select=*&limit=1`;
  let res;
  try {
    res = await fetch(url, { headers: HEADERS });
  } catch (err) {
    return bad(`${table}: fetch threw ${String(err)}`);
  }
  if (res.status === 401 || res.status === 403) return ok(`${table}: anon SELECT blocked (${res.status})`);
  if (!res.ok) {
    // Could be 404 if table missing, 400 for bad request — treat as non-leak
    return ok(`${table}: anon SELECT non-200 (${res.status})`);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return ok(`${table}: anon SELECT returned non-JSON (likely empty)`);
  }
  if (Array.isArray(body) && body.length === 0) {
    return ok(`${table}: anon SELECT returned empty []`);
  }
  return bad(`${table}: anon SELECT leaked ${Array.isArray(body) ? body.length : 'non-array'} rows`);
}

async function writeBlocked({ table, payload }) {
  const url = `${BASE}/${table}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return bad(`${table}: INSERT fetch threw ${String(err)}`);
  }
  if (res.status >= 400) return ok(`${table}: anon INSERT blocked (${res.status})`);
  return bad(`${table}: anon INSERT succeeded (${res.status}) — RLS leak`);
}

async function main() {
  console.log(`RLS tests against ${SUPABASE_URL}`);
  console.log('Reads:');
  for (const t of READ_TABLES) await readBlocked(t);
  console.log('Writes:');
  for (const w of WRITE_TABLES) await writeBlocked(w);

  console.log('');
  console.log(`Result: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
