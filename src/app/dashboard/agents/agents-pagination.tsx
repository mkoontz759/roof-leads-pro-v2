'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface PaginationProps {
  pagination: {
    total: number
    pageCount: number
    currentPage: number
    pageSize: number
  }
}

export function AgentsPagination({ pagination }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `?${params.toString()}`
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const { currentPage, pageCount } = pagination

    // Always show first page
    pages.push(1)

    // Add ellipsis if needed
    if (currentPage > 3) {
      pages.push('ellipsis')
    }

    // Add pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(pageCount - 1, currentPage + 1); i++) {
      pages.push(i)
    }

    // Add ellipsis if needed
    if (currentPage < pageCount - 2) {
      pages.push('ellipsis')
    }

    // Always show last page
    if (pageCount > 1) {
      pages.push(pageCount)
    }

    return pages
  }

  return (
    <div className="flex justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        disabled={pagination.currentPage === 1}
        onClick={() => router.push(createPageURL(pagination.currentPage - 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getPageNumbers().map((page, i) => (
        page === 'ellipsis' ? (
          <Button key={`ellipsis-${i}`} variant="ghost" disabled>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            key={page}
            variant={pagination.currentPage === page ? "default" : "outline"}
            onClick={() => router.push(createPageURL(page as number))}
          >
            {page}
          </Button>
        )
      ))}

      <Button
        variant="outline"
        size="icon"
        disabled={pagination.currentPage === pagination.pageCount}
        onClick={() => router.push(createPageURL(pagination.currentPage + 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
} 