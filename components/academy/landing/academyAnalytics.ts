export async function captureAcademyEvent(event: string, properties: Record<string, unknown>) {
  try {
    const { default: posthog } = await import('posthog-js')
    posthog.capture(event, properties)
  } catch {}
}
