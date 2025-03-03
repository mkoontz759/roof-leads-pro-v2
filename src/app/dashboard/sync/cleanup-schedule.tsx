'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

interface CleanupScheduleProps {
  initialSchedule?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
  }
}

export function CleanupSchedule({ initialSchedule }: CleanupScheduleProps) {
  const [schedule, setSchedule] = useState(initialSchedule || {
    enabled: false,
    frequency: 'weekly',
    time: '00:00',
    dayOfWeek: 0
  })

  const saveSchedule = async () => {
    try {
      const response = await fetch('/api/mls/cleanup/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Schedule Updated",
          description: "Cleanup schedule has been updated successfully"
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Failed to Update Schedule",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cleanup Schedule</span>
          <Switch 
            checked={schedule.enabled}
            onCheckedChange={(enabled) => setSchedule(s => ({ ...s, enabled }))}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <Select
              value={schedule.frequency}
              onValueChange={(frequency: any) => setSchedule(s => ({ ...s, frequency }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add time picker and day selectors based on frequency */}

          <Button onClick={saveSchedule}>Save Schedule</Button>
        </div>
      </CardContent>
    </Card>
  )
} 