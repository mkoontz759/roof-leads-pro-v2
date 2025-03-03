import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing, MLSAgent, ListingLifecycle } from '@/lib/models/mls'

export async function GET() {
  try {
    await connectDB()
    
    // Count active and pending listings
    const activeListingsCount = await MLSListing.countDocuments({ 
      lifecycleStatus: ListingLifecycle.ACTIVE 
    })
    
    const pendingListingsCount = await MLSListing.countDocuments({ 
      lifecycleStatus: ListingLifecycle.PENDING 
    })
    
    // Count agents
    const totalAgents = await MLSAgent.countDocuments()
    
    // Get a sample of pending listings to check
    const pendingSample = await MLSListing.find({ 
      lifecycleStatus: ListingLifecycle.PENDING 
    })
    .limit(5)
    .lean()
    
    // Check if any agents have pending listings assigned
    const agentsWithPendingListings = await MLSAgent.aggregate([
      {
        $lookup: {
          from: 'mlslistings',
          let: { agentKey: '$memberKey' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$listAgentKey', '$$agentKey'] },
                    { $eq: ['$lifecycleStatus', ListingLifecycle.PENDING] }
                  ]
                }
              }
            }
          ],
          as: 'pendingListings'
        }
      },
      {
        $match: {
          'pendingListings.0': { $exists: true }
        }
      },
      {
        $count: 'count'
      }
    ])
    
    // Check original mlsStatus field to see if there's a disconnect
    const mlsStatusCounts = await MLSListing.aggregate([
      {
        $group: {
          _id: '$mlsStatus',
          count: { $sum: 1 }
        }
      }
    ])
    
    // Check agent key references
    let agentKeyMatches = 0
    if (pendingSample.length > 0) {
      const sampleAgentKeys = pendingSample.map(listing => listing.listAgentKey)
      agentKeyMatches = await MLSAgent.countDocuments({
        memberKey: { $in: sampleAgentKeys }
      })
    }
    
    return NextResponse.json({
      success: true,
      counts: {
        active: activeListingsCount,
        pending: pendingListingsCount,
        agents: totalAgents,
        agentsWithPendingListings: agentsWithPendingListings[0]?.count || 0
      },
      mlsStatusBreakdown: mlsStatusCounts,
      samplePendingListings: pendingSample.map(listing => ({
        listingKey: listing.listingKey,
        listAgentKey: listing.listAgentKey,
        lifecycleStatus: listing.lifecycleStatus,
        mlsStatus: listing.mlsStatus
      })),
      agentKeyMatches,
      message: "Database check completed"
    })
  } catch (error) {
    console.error('Database check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 