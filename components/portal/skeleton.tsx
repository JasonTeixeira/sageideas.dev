import { cn } from '@/lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-[#18181b] border border-[#27272a]',
        className,
      )}
      {...rest}
    />
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23] px-4">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonTopbar() {
  return (
    <div className="sticky top-0 z-30 backdrop-blur bg-[#09090B]/80 border-b border-[#27272a]">
      <div className="flex items-center justify-between px-6 lg:px-8 h-14">
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
