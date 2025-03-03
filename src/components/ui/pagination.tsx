import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, total, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => i + 1)
          .filter(num => 
            num === 1 || 
            num === total || 
            (num >= page - 1 && num <= page + 1)
          )
          .map((num, i, arr) => (
            <div key={num} className="flex items-center">
              {i > 0 && arr[i - 1] !== num - 1 && (
                <span className="px-2">...</span>
              )}
              <Button
                variant={page === num ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(num)}
              >
                {num}
              </Button>
            </div>
          ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= total}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
} 