import { NextRequest, NextResponse } from 'next/server'
import { mlsSyncService } from '@/lib/services/mls-sync-service'
import { MLSSource } from '@/lib/models/mls'

/**
 * Endpoint for automated incremental syncs triggered by cron jobs
 * This endpoint should be called hourly to keep data up-to-date
 * For security, it checks for a valid authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || !authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.CRON_SECRET) {
      console.warn('Unauthorized cron job attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting scheduled incremental MLS sync via cron job...')
    
    // Run incremental sync for all configured MLS sources
    const results = await mlsSyncService.syncAll('incremental')
    
    const allSuccess = results.every(result => result.success)
    console.log(`${allSuccess ? '✅ All' : '⚠️ Some'} scheduled syncs completed`, results)

    return NextResponse.json({
      success: allSuccess,
      results
    })

  } catch (error) {
    console.error('❌ Scheduled sync failed:', error)
    return NextResponse.json(
      { error: 'Scheduled sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 