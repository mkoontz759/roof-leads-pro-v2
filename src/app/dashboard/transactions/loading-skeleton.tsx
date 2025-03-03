export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 w-[100px] bg-muted rounded animate-pulse" />
          <div className="h-4 w-[160px] bg-muted rounded animate-pulse" />
        </div>
        <div className="h-4 w-[120px] bg-muted rounded animate-pulse" />
      </div>
      <div className="border rounded-lg">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="space-y-3">
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 