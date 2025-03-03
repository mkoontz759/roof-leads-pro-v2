import { NextResponse } from 'next/server'
import { mlsSyncService } from '@/lib/services/mls-sync-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body to get sync type
    const body = await request.json().catch(() => ({}))
    const syncType = body.type === 'full' ? 'full' : 'incremental'

    // Start sync for all configured MLS sources
    const results = await mlsSyncService.syncAll(syncType)

    return NextResponse.json({
      success: results.every(result => result.success),
      results
    })

  } catch (error) {
    console.error('Multi-source sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 