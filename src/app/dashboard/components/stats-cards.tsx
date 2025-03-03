'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ClipboardList, Clock, Home, User, UserCheck, AlertTriangle } from "lucide-react"
import { formatInTimeZone } from 'date-fns-tz'

interface StatsCardsProps {
  totalAgents: number
  totalListings: number
  totalPendingTransactions: number
  lastSyncedAt: Date
  agentsWithActiveListings?: number 
  agentsWithPendingListings?: number
  invalidAgentKeysActive?: number
  invalidAgentKeysPending?: number
}

export function StatsCards({ 
  totalAgents, 
  totalListings, 
  totalPendingTransactions, 
  lastSyncedAt,
  agentsWithActiveListings,
  agentsWithPendingListings,
  invalidAgentKeysActive,
  invalidAgentKeysPending
}: StatsCardsProps) {
  const timeZone = 'America/Chicago'  // Central Time
  
  // Format the date and time in Central Time
  const formattedDate = formatInTimeZone(lastSyncedAt, timeZone, 'MMM d, yyyy')
  const formattedTime = formatInTimeZone(lastSyncedAt, timeZone, 'h:mm a')

  // Check if we have the optional stats
  const hasAgentStats = agentsWithActiveListings !== undefined || agentsWithPendingListings !== undefined
  const hasInvalidStats = invalidAgentKeysActive !== undefined || invalidAgentKeysPending !== undefined
  
  // Total invalid agents
  const totalInvalidAgentKeys = (invalidAgentKeysActive || 0) + (invalidAgentKeysPending || 0)

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              Total MLS agents in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalListings}</div>
            <p className="text-xs text-muted-foreground">
              Total properties in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPendingTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Properties under contract
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Synced</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formattedDate}
            </div>
            <p className="text-xs text-muted-foreground">
              {formattedTime} CT
            </p>
          </CardContent>
        </Card>
      </div>

      {hasAgentStats && (
        <div className="grid gap-4 md:grid-cols-2">
          {agentsWithActiveListings !== undefined && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agents with Active Listings</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentsWithActiveListings}</div>
                <p className="text-xs text-muted-foreground">
                  Valid agents with active listings (out of {totalAgents})
                </p>
              </CardContent>
            </Card>
          )}

          {agentsWithPendingListings !== undefined && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agents with Pending Transactions</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentsWithPendingListings}</div>
                <p className="text-xs text-muted-foreground">
                  Valid agents with pending listings (out of {totalAgents})
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {hasInvalidStats && totalInvalidAgentKeys > 0 && (
        <Card className="border-amber-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Issue Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{totalInvalidAgentKeys} listings</div>
            <p className="text-sm mt-1">
              These listings reference agent IDs that don't exist in your database. 
              {invalidAgentKeysActive !== undefined && (
                <span> {invalidAgentKeysActive} active listings</span>
              )}
              {invalidAgentKeysPending !== undefined && invalidAgentKeysActive !== undefined && (
                <span> and </span>
              )}
              {invalidAgentKeysPending !== undefined && (
                <span> {invalidAgentKeysPending} pending listings</span>
              )} 
              have invalid agent references.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Consider syncing your agent data to resolve this discrepancy
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
} 