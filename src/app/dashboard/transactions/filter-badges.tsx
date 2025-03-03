'use client'

import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FilterBadgesProps {
  timeFrame: string
  priceRange: string
  zipCode: string
  onRemove: (filter: string) => void
  isLoading?: boolean
}

const timeFrameLabels: Record<string, string> = {
  '24h': 'Last 24 Hours',
  '3d': 'Last 3 Days',
  '1w': 'Last Week',
  'thisMonth': 'This Month',
  'lastMonth': 'Last Month',
  'thisYear': 'This Year'
}

const formatPriceRange = (range: string) => {
  if (range === '1000000+') return 'Over $1M'
  const [min, max] = range.split('-').map(Number)
  if (!max) return `$${min/1000}k+`
  return `$${min/1000}k - $${max/1000}k`
}

export function FilterBadges({ timeFrame, priceRange, zipCode, onRemove, isLoading }: FilterBadgesProps) {
  if (timeFrame === 'all' && priceRange === 'all' && zipCode === 'all') return null

  return (
    <div className="flex flex-wrap gap-2">
      {timeFrame !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          {timeFrameLabels[timeFrame]}
          <button 
            onClick={() => onRemove('timeFrame')} 
            className="ml-1 hover:bg-secondary rounded-full"
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {priceRange !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          {formatPriceRange(priceRange)}
          <button 
            onClick={() => onRemove('priceRange')} 
            className="ml-1 hover:bg-secondary rounded-full"
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {zipCode !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          ZIP: {zipCode}
          <button 
            onClick={() => onRemove('zipCode')} 
            className="ml-1 hover:bg-secondary rounded-full"
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  )
} 