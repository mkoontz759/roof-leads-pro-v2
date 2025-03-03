import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent } from '@/lib/models/mls'

export async function GET(request: Request) {
  try {
    await connectDB()
    
    // Get agent count
    const agentCount = await MLSAgent.countDocuments()
    console.log(`Current agent count: ${agentCount}`)
    
    // Get a sample of agents to verify data structure
    const sampleAgents = await MLSAgent.find().limit(3)
    
    return NextResponse.json({
      success: true,
      count: agentCount,
      sample: sampleAgents
    })
    
  } catch (error: any) {
    console.error('Error getting agent count:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 