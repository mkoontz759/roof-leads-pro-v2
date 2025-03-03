import { MLSListing, MLSAgent, ListingLifecycle } from '@/lib/models/mls'
import { connectDB } from '@/lib/mongodb'

export interface CleanupStats {
  archivedListings: number
  deletedAgents: number
  storageReclaimed: number
}

export async function runCleanup(): Promise<CleanupStats> {
  await connectDB()
  const stats: CleanupStats = {
    archivedListings: 0,
    deletedAgents: 0,
    storageReclaimed: 0
  }

  // Archive old listings (older than 30 days and not pending)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const archiveResult = await MLSListing.updateMany(
    {
      modificationTimestamp: { $lt: thirtyDaysAgo },
      isArchived: false,
      lifecycleStatus: { $ne: ListingLifecycle.PENDING }
    },
    {
      $set: {
        isArchived: true,
        lifecycleStatus: ListingLifecycle.ARCHIVED
      }
    }
  )
  stats.archivedListings = archiveResult.modifiedCount

  // Delete inactive agents (no active listings in 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const activeAgentKeys = await MLSListing.distinct('listAgentKey', {
    modificationTimestamp: { $gte: ninetyDaysAgo },
    isArchived: false
  })

  const deleteResult = await MLSAgent.deleteMany({
    memberKey: { $nin: activeAgentKeys }
  })
  stats.deletedAgents = deleteResult.deletedCount

  // Calculate storage reclaimed (rough estimate)
  stats.storageReclaimed = (stats.archivedListings * 1024) + (stats.deletedAgents * 512) // in bytes

  return stats
} 