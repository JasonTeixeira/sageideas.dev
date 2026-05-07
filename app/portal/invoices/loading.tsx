import { SkeletonList, SkeletonTopbar } from '@/components/portal/skeleton';

export default function InvoicesLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <div className="h-7 w-40 rounded-md bg-[#18181b] border border-[#27272a] animate-pulse" />
        <SkeletonList rows={5} />
      </div>
    </>
  );
}
