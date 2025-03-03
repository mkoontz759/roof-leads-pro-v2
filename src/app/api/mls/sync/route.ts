import { NextResponse } from 'next/server'
import { syncAgents } from '@/lib/services/agent-sync'
import { getMLSToken, getNewPendingContracts } from '@/lib/mls-auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { target } = await request.json()
    
    if (target === 'agents') {
      const result = await syncAgents()
      return NextResponse.json(result)
    }

    if (target === 'full') {
      // Get MLS token
      const token = await getMLSToken()
      
      // Fetch all data
      const { listings, agents } = await getNewPendingContracts(token)
      
      // Process the data
      const result = {
        success: true,
        agentCount: agents.length,
        transactionCount: listings.length,
        message: `Synced ${agents.length} agents and ${listings.length} transactions`
      }

      return NextResponse.json(result)
    }

    // Invalid target
    return NextResponse.json({
      success: false,
      error: 'Invalid sync target specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 