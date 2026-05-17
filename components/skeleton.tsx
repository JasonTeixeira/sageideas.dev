import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('skeleton', className)} />
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-[#1A1917] border border-[#2A2826] rounded-2xl overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function CaseStudyCardSkeleton() {
  return (
    <div className="bg-[#1A1917] border border-[#2A2826] rounded-2xl overflow-hidden">
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="p-8 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function MetricSkeleton() {
  return (
    <div className="text-center space-y-2">
      <Skeleton className="h-12 w-24 mx-auto" />
      <Skeleton className="h-4 w-20 mx-auto" />
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-6 w-full max-w-2xl" />
    </div>
  )
}
