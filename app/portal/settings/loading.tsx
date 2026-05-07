import { Skeleton, SkeletonTopbar } from '@/components/portal/skeleton';

export default function SettingsLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6">
        <div className="h-7 w-40 rounded-md bg-[#18181b] border border-[#27272a] animate-pulse" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </>
  );
}
