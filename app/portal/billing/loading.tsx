import { Skeleton, SkeletonList, SkeletonTopbar } from '@/components/portal/skeleton';

export default function BillingLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <div className="h-7 w-32 rounded-md bg-[#18181b] border border-[#27272a] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <SkeletonList rows={4} />
      </div>
    </>
  );
}
