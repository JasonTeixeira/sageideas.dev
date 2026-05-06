import { getPortalContext } from '@/lib/portal/auth';
import { getServiceCatalog } from '@/lib/portal/queries';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata = { title: 'Service catalog' };

export default async function CatalogPage() {
  await getPortalContext();
  const items = await getServiceCatalog();

  const oneTime = (items as any[]).filter((i) => !i.recurring);
  const recurring = (items as any[]).filter((i) => i.recurring);

  return (
    <>
      <Topbar crumbs={[{ label: 'Service catalog' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Service catalog</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Add a sprint, an audit, or an ongoing care plan. Stripe handles checkout. Engagement is
            provisioned automatically once payment clears.
          </p>
        </div>

        <Section title="Sprints &amp; one-time engagements">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {oneTime.map((i) => (
              <ServiceCard key={i.id} item={i} />
            ))}
          </div>
        </Section>

        <Section title="Subscriptions &amp; care plans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurring.map((i) => (
              <ServiceCard key={i.id} item={i} />
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wider text-[#52525b] mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ServiceCard({ item }: { item: any }) {
  return (
    <Card className="glow-ring">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="rounded-lg bg-[#06b6d4]/10 p-2 border border-[#06b6d4]/20">
            <Sparkles className="w-4 h-4 text-[#06b6d4]" />
          </div>
          {item.recurring && <Badge tone="violet">Monthly</Badge>}
        </div>
        <div className="font-semibold text-[#fafafa] mb-1">{item.name}</div>
        <p className="text-xs text-[#a1a1aa] flex-1 leading-relaxed">{item.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="mono text-base font-semibold text-[#fafafa]">
            {formatCurrency(Number(item.price))}
            {item.recurring && <span className="text-xs text-[#71717a] font-normal">/mo</span>}
          </div>
          <form action={`/api/portal/checkout`} method="POST">
            <input type="hidden" name="priceId" value={item.stripe_price_id} />
            <input type="hidden" name="recurring" value={item.recurring ? '1' : '0'} />
            <Button size="sm" type="submit">
              Add
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
