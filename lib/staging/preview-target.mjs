const IMMUTABLE_STAGING_PREVIEW = /^sageideas-academy-staging-[a-z0-9]+-sage-ideas\.vercel\.app$/

export function validateStagingPreviewTarget(value) {
  try {
    const target = new URL(value)
    const isSafe = target.protocol === 'https:'
      && target.username === ''
      && target.password === ''
      && target.port === ''
      && target.pathname === '/'
      && target.search === ''
      && target.hash === ''
      && IMMUTABLE_STAGING_PREVIEW.test(target.hostname)
    if (isSafe) return target
  } catch {
    // Fall through to the single fail-closed error below.
  }

  throw new Error('STAGING_BASE_URL must be an immutable SageIdeas staging Preview URL.')
}

export function isApprovedStagingPreviewHostname(hostname) {
  return IMMUTABLE_STAGING_PREVIEW.test(hostname)
}
