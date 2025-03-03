'use client'

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"

type SortOption = {
  value: 'recent' | 'price-high' | 'price-low' | 'most-pending' | 'least-pending' | 'most-active' | 'least-active' | 'most-total' | 'least-total'
  label: string
}

const sortOptions: SortOption[] = [
  { value: 'most-total', label: 'Most Listings' },
  { value: 'most-active', label: 'Most Active' },
  { value: 'most-pending', label: 'Most Pending' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'price-high', label: 'Highest Price' },
  { value: 'price-low', label: 'Lowest Price' }
]

export function AgentSorts() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentSort = searchParams.get('sort') || 'most-total'
  
  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('sort', value)
    params.set('page', '1') // Reset to first page when changing sort
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col items-center gap-4 mb-8">
      <h2 className="text-lg font-semibold text-muted-foreground">Sort Agents</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {sortOptions.map((option) => (
          <Button
            key={option.value}
            variant={currentSort === option.value ? "default" : "outline"}
            onClick={() => handleSortChange(option.value)}
            className="min-w-[120px]"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
} 