'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface SyncRecord {
  startTime: string
  endTime: string
  status: 'success' | 'failed'
  listingsProcessed?: number
  agentsProcessed?: number
  listingsUpserted?: number
  agentsUpserted?: number
  error?: string
  duration: number
}

interface PaginationData {
  total: number
  pages: number
  currentPage: number
  limit: number
}

export function SyncDashboard() {
  const [syncs, setSyncs] = useState<SyncRecord[]>([])
  const [pagination, setPagination] = useState<PaginationData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [syncing, setSyncing] = useState(false)

  const fetchSyncs = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      if (filter !== 'all') {
        params.append('status', filter)
      }
      
      const res = await fetch(`/api/sync/history?${params}`)
      if (!res.ok) throw new Error('Failed to fetch sync history')
      
      const data = await res.json()
      setSyncs(data.syncs)
      setPagination(data.pagination)
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncs()
  }, [filter])

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/mls/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      await fetchSyncs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">MLS Sync History</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      
      <div className="mb-4">
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="border rounded p-2 bg-background text-foreground"
        >
          <option value="all">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="p-4 text-left font-medium">Start Time</th>
              <th className="p-4 text-left font-medium">Status</th>
              <th className="p-4 text-left font-medium">Duration</th>
              <th className="p-4 text-left font-medium">Listings</th>
              <th className="p-4 text-left font-medium">Agents</th>
              <th className="p-4 text-left font-medium">Error</th>
            </tr>
          </thead>
          <tbody className="bg-background">
            {syncs.map((sync, i) => (
              <tr key={i} className="border-b border-border">
                <td className="p-4">
                  {format(new Date(sync.startTime), 'MMM d, yyyy HH:mm:ss')}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded ${
                    sync.status === 'success' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' 
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
                  }`}>
                    {sync.status}
                  </span>
                </td>
                <td className="p-4">{formatDuration(sync.duration)}</td>
                <td className="p-4">
                  {sync.listingsProcessed ? 
                    `${sync.listingsUpserted}/${sync.listingsProcessed}` : '-'}
                </td>
                <td className="p-4">
                  {sync.agentsProcessed ? 
                    `${sync.agentsUpserted}/${sync.agentsProcessed}` : '-'}
                </td>
                <td className="p-4 text-red-600 dark:text-red-400">{sync.error || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button
              key={i}
              onClick={() => fetchSyncs(i + 1)}
              className={`px-3 py-1 border rounded ${
                pagination.currentPage === i + 1 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 