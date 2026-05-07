import { Skeleton, SkeletonTopbar } from '@/components/portal/skeleton';

export default function CatalogLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-6">
        <div className="h-7 w-48 rounded-md bg-[#18181b] border border-[#27272a] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </>
  );
}
