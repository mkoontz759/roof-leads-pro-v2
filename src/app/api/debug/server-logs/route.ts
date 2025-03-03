import { NextResponse } from 'next/server'
import { SyncHistory } from '@/lib/models/sync-history'
import { connectDB } from '@/lib/mongodb'

export async function GET() {
  try {
    await connectDB()
    
    // Get the most recent sync logs
    const recentLogs = await SyncHistory.find()
      .sort({ startTime: -1 })
      .limit(3)
      .lean()
    
    return NextResponse.json({
      success: true,
      logs: recentLogs,
      message: "Server logs retrieved successfully"
    })
  } catch (error) {
    console.error('Failed to retrieve logs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 