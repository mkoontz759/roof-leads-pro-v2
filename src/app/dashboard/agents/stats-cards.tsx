import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { Users, Building2, Clock } from "lucide-react"

interface StatsCardsProps {
  totalAgents: number
  totalActiveListings: number
  totalPendingListings: number
  lastSyncedAt: Date | null
}

export function StatsCards({ 
  totalAgents, 
  totalActiveListings, 
  totalPendingListings,
  lastSyncedAt 
}: StatsCardsProps) {
  const formatDateTime = (date: Date | null) => {
    if (!date) return 'No sync recorded'
    const formattedDate = format(new Date(date), 'MMM d, yyyy')
    const formattedTime = format(new Date(date), 'h:mm a')
    return `${formattedDate}\n${formattedTime} CT`
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAgents}</div>
          <p className="text-xs text-muted-foreground">
            with active or pending listings
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActiveListings}</div>
          <p className="text-xs text-muted-foreground">
            {totalPendingListings} pending transactions
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Synced</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold whitespace-pre-line">
            {formatDateTime(lastSyncedAt)}
          </div>
          <p className="text-xs text-muted-foreground">
            {lastSyncedAt ? 'Updates hourly' : 'Visit Sync Dashboard to update'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 