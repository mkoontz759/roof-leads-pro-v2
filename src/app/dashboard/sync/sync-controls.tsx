'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react"

interface SyncStatus {
  lastSyncedAt: Date
  status: 'running' | 'completed' | 'failed' | 'never'
  completedAt?: Date
  error?: string
}

interface SyncControlsProps {
  initialStatus: SyncStatus
}

export function SyncControls({ initialStatus }: SyncControlsProps) {
  const [status, setStatus] = useState<SyncStatus>(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const triggerSync = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/cron/sync?key=localdev', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Sync failed')
      }
      
      const data = await response.json()
      setStatus({
        lastSyncedAt: new Date(data.lastSyncedAt),
        status: 'completed',
        completedAt: new Date()
      })
      router.refresh()
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a')
  }

  const getStatusDisplay = () => {
    switch (status.status) {
      case 'running':
        return (
          <div className="flex items-center gap-2 text-blue-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Sync in progress...</span>
          </div>
        )
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span>Last sync completed successfully</span>
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>Sync failed: {status.error}</span>
          </div>
        )
      case 'never':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Never synced</span>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Sync Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Last Sync</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(status.lastSyncedAt)}
              </p>
            </div>
            <div>
              {getStatusDisplay()}
            </div>
          </div>
          
          <Button
            onClick={triggerSync}
            disabled={isLoading || status.status === 'running'}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Automatic Sync Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The system automatically syncs MLS data every hour at minute 0 (e.g., 1:00, 2:00, etc.).
            You can manually trigger a sync above if you need the latest data immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 