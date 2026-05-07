import { Skeleton, SkeletonTopbar } from '@/components/portal/skeleton';

export default function InvoiceDetailLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </>
  );
}
