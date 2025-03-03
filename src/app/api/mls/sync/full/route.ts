import { NextResponse } from 'next/server'
import { mlsSyncService } from '@/lib/services/mls-sync-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MLSSource } from '@/lib/models/mls'

export async function POST() {
  try {
    console.log('🔄 Starting full MLS sync...')
    
    // TEMPORARY: Bypass authentication for testing
    /* 
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    */

    console.log('🔍 Invoking MLS sync service for Spark API...')
    
    // Start sync using Spark API via our service abstraction
    const result = await mlsSyncService.syncSource(MLSSource.SPARK, 'full')
    
    console.log('✅ Sync completed successfully', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Full sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 