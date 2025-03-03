'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { TransactionFilters } from './transaction-filters'
import { FilterBadges } from './filter-badges'
import { useCallback, useState, useEffect } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from "@/components/ui/use-toast"

interface TransactionFiltersWrapperProps {
  timeFrame: string
  priceRange: string
  zipCode: string
  zipCodes: string[]
  totalResults: number
}

export function TransactionFiltersWrapper({
  timeFrame,
  priceRange,
  zipCode,
  zipCodes,
  totalResults,
}: TransactionFiltersWrapperProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [localZipCode, setLocalZipCode] = useState(zipCode)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  const createQueryString = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    params.delete('page') // Reset to first page when filters change
    return params.toString()
  }, [searchParams])

  const handleFilterChange = useCallback((updates: Record<string, string>) => {
    setIsLoading(true)
    router.push('?' + createQueryString(updates))
  }, [router, createQueryString])

  // Debounce zip code changes
  useDebounce(() => {
    if (localZipCode !== zipCode) {
      handleFilterChange({ zipCode: localZipCode })
    }
  }, 300, [localZipCode])

  // Add debounced search
  useDebounce(() => {
    if (searchQuery) {
      router.push('?' + createQueryString({ search: searchQuery }))
    } else {
      const params = new URLSearchParams(searchParams)
      params.delete('search')
      router.push('?' + params.toString())
    }
  }, 300, [searchQuery])

  const handleRemoveFilter = (filter: string) => {
    setIsLoading(true)
    const updates = { [filter]: 'all' }
    if (filter === 'zipCode') {
      setLocalZipCode('all')
    }
    router.push('?' + createQueryString(updates))
    
    toast({
      title: "Filter removed",
      description: `${filter.charAt(0).toUpperCase() + filter.slice(1)} filter has been removed.`,
    })
  }

  const handleClearFilters = () => {
    setIsLoading(true)
    setLocalZipCode('all')
    setSearchQuery('')
    router.push(window.location.pathname)  // This will clear all params
    
    toast({
      title: "Filters cleared",
      description: "All filters have been cleared.",
    })
  }

  // Reset loading state after navigation
  useEffect(() => {
    setIsLoading(false)
  }, [searchParams])

  const hasActiveFilters = timeFrame !== 'all' || priceRange !== 'all' || zipCode !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-2xl">
          <TransactionFilters
            timeFrame={timeFrame}
            priceRange={priceRange}
            zipCode={localZipCode}
            zipCodes={zipCodes}
            isLoading={isLoading}
            onTimeFrameChange={(value) => {
              handleFilterChange({ timeFrame: value })
              toast({
                title: "Time frame updated",
                description: `Showing transactions from ${value}.`,
              })
            }}
            onPriceRangeChange={(value) => {
              handleFilterChange({ priceRange: value })
              toast({
                title: "Price range updated",
                description: `Showing transactions in ${value} range.`,
              })
            }}
            onZipCodeChange={setLocalZipCode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {totalResults.toLocaleString()} results found
            </span>
            <Button 
              variant="ghost" 
              onClick={handleClearFilters}
              disabled={isLoading}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>
      <FilterBadges
        timeFrame={timeFrame}
        priceRange={priceRange}
        zipCode={zipCode}
        onRemove={handleRemoveFilter}
        isLoading={isLoading}
      />
    </div>
  )
} 