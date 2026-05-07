/**
 * Pure resolution of the active org from explicit slug, cookie, or first
 * membership. Extracted so unit tests can exercise the precedence without
 * dragging in next/headers + supabase.
 */

export type OrgRef = { id: string; name: string; slug: string | null };
export type MembershipRef = { org: OrgRef; role: string };

export function resolveActiveOrg(
  memberships: MembershipRef[],
  hint: { slug?: string | null; cookieSlug?: string | null },
): MembershipRef | null {
  if (memberships.length === 0) return null;
  if (hint.slug) {
    const m = memberships.find((mm) => mm.org.slug === hint.slug);
    if (m) return m;
  }
  if (hint.cookieSlug) {
    const m = memberships.find((mm) => mm.org.slug === hint.cookieSlug);
    if (m) return m;
  }
  return memberships[0];
}
