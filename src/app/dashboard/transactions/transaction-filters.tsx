'use client'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Search, Filter, Loader2 } from "lucide-react"

const timeFrames = [
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last 3 Days', value: '3d' },
  { label: 'Last Week', value: '1w' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year', value: 'thisYear' },
]

const priceRanges = [
  { label: '$0-200k', value: '0-200000' },
  { label: '$200-300k', value: '200000-300000' },
  { label: '$300-400k', value: '300000-400000' },
  { label: '$400-500k', value: '400000-500000' },
  { label: '$500-750k', value: '500000-750000' },
  { label: '$750k-1M', value: '750000-1000000' },
  { label: 'Over $1M', value: '1000000+' },
]

interface TransactionFiltersProps {
  timeFrame: string
  priceRange: string
  zipCode: string
  zipCodes: Array<{ code: string, count: number }>
  isLoading?: boolean
  onTimeFrameChange: (value: string) => void
  onPriceRangeChange: (value: string) => void
  onZipCodeChange: (value: string) => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function TransactionFilters({
  timeFrame,
  priceRange,
  zipCode,
  zipCodes,
  isLoading,
  onTimeFrameChange,
  onPriceRangeChange,
  onZipCodeChange,
  searchQuery,
  onSearchChange,
}: TransactionFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by address or agent name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px]" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              Time Frame
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px]">
            <DropdownMenuLabel>Filter by Time</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={timeFrame} onValueChange={onTimeFrameChange}>
              {timeFrames.map((tf) => (
                <DropdownMenuRadioItem key={tf.value} value={tf.value}>
                  {tf.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px]" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              Price Range
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px]">
            <DropdownMenuLabel>Filter by Price</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={priceRange} onValueChange={onPriceRangeChange}>
              {priceRanges.map((pr) => (
                <DropdownMenuRadioItem key={pr.value} value={pr.value}>
                  {pr.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px]" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              Zip Code
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px]">
            <DropdownMenuLabel>Filter by Zip Code</DropdownMenuLabel>
            <div className="p-2">
              <Input
                placeholder="Search zip codes..."
                value={zipCode}
                onChange={(e) => onZipCodeChange(e.target.value)}
                className="mb-2"
                disabled={isLoading}
              />
              <div className="max-h-[200px] overflow-y-auto">
                {zipCodes
                  .filter(({ code }) => code.includes(zipCode))
                  .map(({ code, count }) => (
                    <Button
                      key={code}
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => onZipCodeChange(code)}
                      disabled={isLoading}
                    >
                      <span>{code}</span>
                      <span className="text-muted-foreground">({count})</span>
                    </Button>
                  ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 