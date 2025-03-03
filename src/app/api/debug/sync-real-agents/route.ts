import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { syncSparkData } from '@/lib/services/spark-sync'

const API_KEY = process.env.CRON_SECRET || 'localdev'

/**
 * This endpoint triggers a full Spark data sync that will only use real agent data
 * It will not generate any fake agents, and will rely solely on the API data
 */
export async function GET(request: Request) {
  try {
    // Simple API key authentication
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('key')
    
    if (!apiKey || apiKey !== API_KEY) {
      console.log('Unauthorized attempt to access debug endpoint')
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    // Run full sync using only real agent data
    const result = await syncSparkData('full')
    
    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully using only real agent data',
      result
    })
  } catch (error) {
    console.error('Error syncing real agent data:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to sync real agent data',
      error: (error as Error).message
    }, { status: 500 })
  }
} 