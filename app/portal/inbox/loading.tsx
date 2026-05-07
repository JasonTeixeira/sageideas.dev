import { SkeletonList, SkeletonTopbar } from '@/components/portal/skeleton';

export default function InboxLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-4">
        <div className="h-7 w-32 rounded-md bg-[#18181b] border border-[#27272a] animate-pulse" />
        <SkeletonList rows={6} />
      </div>
    </>
  );
}
