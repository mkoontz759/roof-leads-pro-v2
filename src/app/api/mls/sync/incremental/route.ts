import { NextResponse } from 'next/server'
import { mlsSyncService } from '@/lib/services/mls-sync-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MLSSource } from '@/lib/models/mls'

/**
 * Endpoint for incremental syncs that can be triggered by a scheduler
 * This is more efficient than full syncs for regular updates
 */
export async function POST(request: Request) {
  try {
    console.log('🔄 Starting incremental MLS sync...')
    
    // Get the source from the request if provided, default to Spark
    let source = MLSSource.SPARK
    try {
      const body = await request.json()
      if (body.source && Object.values(MLSSource).includes(body.source)) {
        source = body.source
      }
    } catch (e) {
      // If body parsing fails, use default source
    }
    
    // Start incremental sync using service
    const result = await mlsSyncService.syncSource(source, 'incremental')
    
    console.log('✅ Incremental sync completed', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Incremental sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 