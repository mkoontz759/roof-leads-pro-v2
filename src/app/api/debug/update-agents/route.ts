import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent } from '@/lib/models/mls'

const API_KEY = process.env.CRON_SECRET || 'localdev'

// Define a type for the agent object to fix TypeScript errors
interface AgentDocument {
  memberKey: string;
  fullName: string;
  officeName?: string;
  pendingListings?: Array<any>;
  [key: string]: any;
}

/**
 * This endpoint calls the fix-agent-relationships endpoint and then
 * verifies the result by checking a specific agent's details.
 */
export async function GET(request: Request) {
  try {
    // Simple API key authentication
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('key')
    
    if (!apiKey || apiKey !== API_KEY) {
      console.log('Unauthorized attempt to access update-agents endpoint')
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    await connectDB()

    // Step 1: Call the fix-agent-relationships endpoint
    console.log('Calling fix-agent-relationships endpoint...')
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const fixResponse = await fetch(`${origin}/api/debug/fix-agent-relationships?key=${API_KEY}`)
    const fixData = await fixResponse.json()
    
    if (!fixData.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fix agent relationships',
        error: fixData.message
      }, { status: 500 })
    }
    
    // Step 2: Check some specific agents to verify the fix
    console.log('Verifying fix by checking agent details...')
    const verificationAgents = ['agent-pampa', 'agent-amarillo', 'agent-canyon']
    const verificationResults = []
    
    for (const agentKey of verificationAgents) {
      const agent = await MLSAgent.findOne({ memberKey: agentKey }).lean() as AgentDocument | null
      
      if (agent) {
        verificationResults.push({
          agentKey: agent.memberKey,
          name: agent.fullName,
          officeName: agent.officeName,
          pendingCount: agent.pendingListings?.length || 0
        })
      } else {
        verificationResults.push({
          agentKey,
          error: 'Agent not found'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Agent fix verification completed',
      fixResults: fixData,
      verifiedAgents: verificationResults
    })
  } catch (error) {
    console.error('Error in update-agents verification:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to verify agent updates',
      error: (error as Error).message
    }, { status: 500 })
  }
} 