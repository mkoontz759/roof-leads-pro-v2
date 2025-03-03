'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"

export function PageSizeSelector({ currentPageSize }: { currentPageSize: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('pageSize', value)
    params.set('page', '1') // Reset to first page when changing page size
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Show:</span>
      <Select value={currentPageSize.toString()} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="12">12</SelectItem>
          <SelectItem value="24">24</SelectItem>
          <SelectItem value="60">60</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
} 