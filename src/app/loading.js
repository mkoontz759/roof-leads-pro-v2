'use client'

import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading...</span>
    </div>
  )
} 