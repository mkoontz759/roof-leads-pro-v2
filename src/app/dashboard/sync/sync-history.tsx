'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react"

export interface SyncEvent {
  id: string
  type: 'quick' | 'full'
  status: 'success' | 'failed' | 'in-progress'
  target: 'listings' | 'agents'
  startTime: Date
  endTime?: Date
  listingsProcessed?: number
  agentsProcessed?: number
  error?: string
  changes?: Array<{ mlsId: string, changes: string[] }>
}

interface SyncHistoryProps {
  initialEvents?: SyncEvent[]
}

export function SyncHistory({ initialEvents = [] }: SyncHistoryProps) {
  const [events, setEvents] = useState<SyncEvent[]>(initialEvents)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [syncs, setSyncs] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filter !== 'all' ? { type: filter } : {})
        )
      })

      const response = await fetch(`/api/mls/sync/history?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setEvents(data.events)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [pagination.page, filter])

  const getStatusIcon = (status: SyncEvent['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'in-progress':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: SyncEvent['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'in-progress':
        return <Badge variant="default">In Progress</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Syncs</CardTitle>
        <Select
          value={filter}
          onValueChange={setFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="quick">Quick Sync</SelectItem>
            <SelectItem value="full">Full Sync</SelectItem>
            <SelectItem value="failed">Failed Syncs</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No sync history found
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {event.type === 'quick' ? 'Quick Sync' : 'Full Sync'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(event.startTime).toLocaleString()}
                  </div>
                </div>
                <Badge
                  variant={event.status === 'success' ? 'success' : 'destructive'}
                >
                  {event.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
          </div>
          <Pagination 
            page={pagination.page}
            total={pagination.pages}
            onPageChange={(page) => setPagination(p => ({ ...p, page }))}
          />
        </div>
      </CardContent>
    </Card>
  )
} 