import { notFound } from 'next/navigation';

// No `dynamic = 'force-dynamic'`: with the parent layout's force-dynamic
// already applying, declaring it again here can leave the response status
// stuck at 200 because Vercel commits headers before the page throws.
// Treating the route as static lets Next set 404 synchronously.

export default function PortalCatchAll() {
  notFound();
}
