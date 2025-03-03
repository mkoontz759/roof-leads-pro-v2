import { Redis } from '@upstash/redis'
import { runCleanup } from './cleanup'

const CLEANUP_SCHEDULE_KEY = 'cleanup:schedule'
const CLEANUP_LAST_RUN_KEY = 'cleanup:lastRun'

interface CleanupSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string // HH:mm format
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  lastRun?: string
  nextRun?: string
}

export async function getCleanupSchedule(): Promise<CleanupSchedule | null> {
  const schedule = await redis.get(CLEANUP_SCHEDULE_KEY)
  return schedule ? JSON.parse(schedule as string) : null
}

export async function setCleanupSchedule(schedule: CleanupSchedule) {
  // Calculate next run time
  const nextRun = calculateNextRun(schedule)
  const updatedSchedule = { ...schedule, nextRun }
  await redis.set(CLEANUP_SCHEDULE_KEY, JSON.stringify(updatedSchedule))
  return updatedSchedule
}

export async function recordCleanupRun() {
  const now = new Date().toISOString()
  await redis.set(CLEANUP_LAST_RUN_KEY, now)
  
  // Update next run time
  const schedule = await getCleanupSchedule()
  if (schedule) {
    schedule.lastRun = now
    await setCleanupSchedule(schedule)
  }
}

function calculateNextRun(schedule: CleanupSchedule): string {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)
  let next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  switch (schedule.frequency) {
    case 'daily':
      if (next <= now) next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + ((7 + (schedule.dayOfWeek || 0) - next.getDay()) % 7))
      if (next <= now) next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setDate(schedule.dayOfMonth || 1)
      if (next <= now) next.setMonth(next.getMonth() + 1)
      break
  }

  return next.toISOString()
} 