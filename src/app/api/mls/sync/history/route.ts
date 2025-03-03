import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { SyncHistory } from '@/lib/models/sync-history'

export async function GET(request: NextRequest) {
  try {
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
      success: true,
      data: {
        syncLogs,
        stats
      }
    })
  } catch (error) {
    console.error('MLS Sync History API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve sync history'
    }, { status: 500 })
  }
} 