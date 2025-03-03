'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export function TriggerSync() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/mls/sync/full', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)
      
      toast({
        title: 'Sync Completed',
        description: `Processed ${data.agents.processed} agents and ${data.listings.processed} listings`,
      })
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleSync} 
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        'Sync MLS Data'
      )}
    </Button>
  )
} 