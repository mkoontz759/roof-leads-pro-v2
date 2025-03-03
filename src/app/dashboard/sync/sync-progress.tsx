'use client'

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

interface SyncProgressProps {
  isActive: boolean
  type: 'quick' | 'full'
  progress: number
  listingsProcessed: number
  agentsProcessed: number
  startTime: Date
}

export function SyncProgress({ 
  isActive, 
  type, 
  progress, 
  listingsProcessed,
  agentsProcessed,
  startTime 
}: SyncProgressProps) {
  if (!isActive) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'quick' ? 'Quick Sync' : 'Full Sync'} in Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Listings Processed</div>
              <div className="font-medium">{listingsProcessed}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Agents Processed</div>
              <div className="font-medium">{agentsProcessed}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
} 