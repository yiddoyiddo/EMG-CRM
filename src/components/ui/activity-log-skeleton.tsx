import { Skeleton } from "@/components/ui/skeleton";

export function ActivityLogSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="mt-2 h-full w-px bg-border" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function ActivityLogsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityLogSkeleton key={i} />
      ))}
    </div>
  );
} 