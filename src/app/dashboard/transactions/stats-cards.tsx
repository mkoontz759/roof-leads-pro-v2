'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDistance } from 'date-fns'
import { DollarSign, Calendar, MapPin, Users } from "lucide-react"

interface StatsCardsProps {
  totalTransactions: number
  totalValue: number
  uniqueAgents: number
  uniqueZipCodes: number
  lastSyncedAt: Date
}

export function StatsCards({ 
  totalTransactions, 
  totalValue, 
  uniqueAgents,
  uniqueZipCodes,
  lastSyncedAt 
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Transactions
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTransactions}</div>
          <p className="text-xs text-muted-foreground">
            Last synced {formatDistance(lastSyncedAt, new Date(), { addSuffix: true })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Value
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(totalValue / 1_000_000).toFixed(1)}M
          </div>
          <p className="text-xs text-muted-foreground">
            Average ${(totalValue / totalTransactions).toLocaleString(undefined, {
              maximumFractionDigits: 0
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Agents
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueAgents}</div>
          <p className="text-xs text-muted-foreground">
            {(totalTransactions / uniqueAgents).toFixed(1)} transactions per agent
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Zip Codes
          </CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueZipCodes}</div>
          <p className="text-xs text-muted-foreground">
            {(totalTransactions / uniqueZipCodes).toFixed(1)} transactions per zip code
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 