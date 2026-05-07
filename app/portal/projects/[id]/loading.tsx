import { Skeleton, SkeletonList, SkeletonTopbar } from '@/components/portal/skeleton';

export default function ProjectDetailLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-10 w-full" />
        <SkeletonList rows={4} />
      </div>
    </>
  );
}
