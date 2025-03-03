import { connectDB } from '@/lib/mongodb'
import { SyncHistory } from '@/lib/models/sync-history'

export interface SyncStatus {
  isActive: boolean
  type: 'quick' | 'full'
  target: 'listings' | 'agents'
  progress: number
  listingsProcessed: number
  agentsProcessed: number
  startTime: string
  lastUpdate: string
  error?: string
}

export async function updateSyncStatus(status: Partial<SyncStatus>) {
  await connectDB()
  
  const currentSync = await SyncHistory.findOne({ 
    isActive: true 
  }).sort({ startTime: -1 })

  if (!currentSync && status.isActive) {
    // Starting new sync
    return await SyncHistory.create({
      startTime: new Date(),
      endTime: new Date(),
      status: 'success',
      listingsProcessed: status.listingsProcessed || 0,
      agentsProcessed: status.agentsProcessed || 0,
      duration: 0
    })
  }

  if (currentSync) {
    // Update existing sync
    const updates = {
      listingsProcessed: status.listingsProcessed,
      agentsProcessed: status.agentsProcessed,
      endTime: new Date(),
      status: status.error ? 'failed' : 'success',
      duration: Date.now() - currentSync.startTime.getTime()
    }

    return await SyncHistory.findByIdAndUpdate(
      currentSync._id,
      updates,
      { new: true }
    )
  }

  return null
}

export async function getSyncStatus(): Promise<SyncStatus | null> {
  await connectDB()
  const currentSync = await SyncHistory.findOne({ 
    isActive: true 
  }).sort({ startTime: -1 })
  
  return currentSync
}

export async function clearSyncStatus() {
  await connectDB()
  await SyncHistory.updateMany(
    { isActive: true },
    { 
      status: 'failed',
      endTime: new Date()
    }
  )
} 