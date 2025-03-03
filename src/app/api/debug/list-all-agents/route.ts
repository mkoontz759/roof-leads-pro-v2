import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent } from '@/lib/models/mls'

export async function GET(request: Request) {
  try {
    await connectDB()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const hasListings = searchParams.get('hasListings') === 'true'
    
    // Build query
    let query: any = {}
    
    // Paginate
    const skip = (page - 1) * limit
    
    // Get count of total agents
    const totalAgents = await MLSAgent.countDocuments(query)
    
    // If checking agents with listings
    let agentsWithListingsCount = 0
    if (hasListings) {
      const pipeline = [
        {
          $lookup: {
            from: 'mlslistings',
            let: { agentKey: '$memberKey' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $toLower: '$listAgentKey' },
                      { $toLower: '$$agentKey' }
                    ]
                  }
                }
              }
            ],
            as: 'listings'
          }
        },
        {
          $match: {
            listings: { $ne: [] }
          }
        },
        {
          $count: 'total'
        }
      ]
      
      const result = await MLSAgent.aggregate(pipeline).exec()
      agentsWithListingsCount = result[0]?.total || 0
    }
    
    // Get agents based on query
    let agentsQuery = MLSAgent.find(query).skip(skip).limit(limit)
    
    // Get agents
    const agents = await agentsQuery.exec()
    
    return NextResponse.json({
      success: true,
      agents: {
        total: totalAgents,
        withListings: agentsWithListingsCount,
        page,
        limit,
        data: agents.map(agent => ({
          memberKey: agent.memberKey,
          fullName: agent.fullName,
          email: agent.email,
          phone: agent.phone,
          officeName: agent.officeName,
          source: agent.source
        }))
      }
    })
    
  } catch (error: any) {
    console.error('Error listing agents:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 