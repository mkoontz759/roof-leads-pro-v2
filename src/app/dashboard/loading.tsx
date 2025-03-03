export default function Loading() {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="h-8 w-8 animate-spin">
        <div className="h-full w-full rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  )
} 