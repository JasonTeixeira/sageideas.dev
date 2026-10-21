const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function requireEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for RLS tests`);
  }
  return value;
}

function isLocalTarget(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('RLS_TEST_SUPABASE_URL must be a valid HTTP(S) URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('RLS_TEST_SUPABASE_URL must use HTTP(S)');
  }

  return LOCAL_HOSTS.has(parsed.hostname);
}

function loadAccount(prefix) {
  const defaultEmails = {
    CLIENT1: 'client1+test@sageideas.org',
    CLIENT2: 'client2+test@sageideas.org',
  };
  return {
    email: process.env[`SAGE_TEST_${prefix}_EMAIL`]?.trim() || defaultEmails[prefix],
    password: requireEnvironment(`SAGE_TEST_${prefix}_PASSWORD`),
  };
}

/**
 * Loads the explicit RLS test target. Remote targets fail closed unless the
 * caller separately opts in because these suites may create or delete data.
 */
export function loadRlsTestConfig({
  requireAccounts = false,
  requireServiceRole = false,
} = {}) {
  const supabaseUrl = requireEnvironment('RLS_TEST_SUPABASE_URL');
  const anonKey = requireEnvironment('RLS_TEST_ANON_KEY');

  if (!isLocalTarget(supabaseUrl) && process.env.RLS_TEST_ALLOW_REMOTE !== 'true') {
    throw new Error(
      'Remote RLS tests are disabled. Set RLS_TEST_ALLOW_REMOTE=true only after approval.',
    );
  }

  const serviceRoleKey = requireServiceRole
    ? requireEnvironment('RLS_TEST_SERVICE_ROLE_KEY')
    : process.env.RLS_TEST_SERVICE_ROLE_KEY?.trim() || '';
  const accounts = requireAccounts
    ? { client1: loadAccount('CLIENT1'), client2: loadAccount('CLIENT2') }
    : undefined;

  return { supabaseUrl, anonKey, serviceRoleKey, accounts };
}
