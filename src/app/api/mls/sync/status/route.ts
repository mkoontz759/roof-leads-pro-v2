import { NextRequest, NextResponse } from 'next/server'
import { getSyncStatus } from '@/lib/services/sync-status'
import { MLSListing, MLSAgent } from '@/lib/models/mls'
import { connectDB } from '@/lib/mongodb'
import { SyncHistory } from '@/lib/models/sync-history'

export async function GET(request: NextRequest) {
  try {
    const [syncStatus, dbStats] = await Promise.all([
      getSyncStatus(),
      getDBStats()
    ])

    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    
    // Get the most recent sync logs
    const syncLogs = await SyncHistory.find()
      .sort({ startTime: -1 })
      .limit(limit)
      .lean()
    
    // Calculate some statistics
    const stats = {
      totalSyncs: await SyncHistory.countDocuments(),
      successfulSyncs: await SyncHistory.countDocuments({ status: 'success' }),
      failedSyncs: await SyncHistory.countDocuments({ status: 'failed' }),
      inProgressSyncs: await SyncHistory.countDocuments({ status: 'in-progress' }),
      lastSuccessfulSync: await SyncHistory.findOne({ status: 'success' }).sort({ endTime: -1 }).lean()
    }
    
    return NextResponse.json({
      syncStatus,
      dbStats,
      success: true,
      data: {
        syncLogs,
        stats
      }
    })
  } catch (error) {
    console.error('MLS Sync Status API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve sync status'
    }, { status: 500 })
  }
}

async function getDBStats() {
  await connectDB()
  const [
    activeListings,
    archivedListings,
    activeAgents
  ] = await Promise.all([
    MLSListing.countDocuments({ isArchived: false }),
    MLSListing.countDocuments({ isArchived: true }),
    MLSAgent.countDocuments()
  ])

  return {
    activeListings,
    archivedListings,
    activeAgents
  }
} 