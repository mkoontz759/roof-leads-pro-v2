'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface VerificationLog {
  id: string
  type: string
  status: string
  ipAddress: string | null
  userAgent: string | null
  error: string | null
  createdAt: string
  user: {
    email: string
    name: string | null
  }
}

export default function VerificationLogs() {
  const [logs, setLogs] = useState<VerificationLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch('/api/admin/verification-logs')
        const data = await response.json()
        setLogs(data)
      } catch (error) {
        console.error('Failed to fetch logs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Verification Logs</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {format(new Date(log.createdAt), 'PPpp')}
                </TableCell>
                <TableCell>
                  <div>
                    <div>{log.user.name || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">
                      {log.user.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}
                  >
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>{log.ipAddress}</TableCell>
                <TableCell>
                  {log.error && (
                    <span className="text-destructive">{log.error}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 