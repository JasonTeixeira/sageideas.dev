import { SkeletonKpiGrid, SkeletonList, SkeletonTopbar } from '@/components/portal/skeleton';

export default function PortalDashboardLoading() {
  return (
    <>
      <SkeletonTopbar />
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-md bg-[#18181b] border border-[#27272a] animate-pulse" />
          <div className="h-4 w-80 rounded-md bg-[#18181b] border border-[#27272a] animate-pulse" />
        </div>
        <SkeletonKpiGrid />
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonList rows={3} />
          <SkeletonList rows={3} />
        </div>
      </div>
    </>
  );
}
