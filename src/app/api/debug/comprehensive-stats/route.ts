import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing } from '@/lib/models/mls'
import { ListingLifecycle } from '@/lib/models/mls'

const API_KEY = process.env.LOCALDEV_API_KEY || 'localdev'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    // Verify API key
    if (key !== API_KEY) {
      return NextResponse.json({
        error: 'Invalid API key',
        success: false
      }, { status: 401 })
    }

    await connectDB()
    
    // Basic counts
    const totalAgents = await MLSAgent.countDocuments()
    const totalListings = await MLSListing.countDocuments()
    const pendingTransactions = await MLSListing.countDocuments({ 
      lifecycleStatus: ListingLifecycle.PENDING 
    })
    const activeListings = await MLSListing.countDocuments({ 
      lifecycleStatus: ListingLifecycle.ACTIVE 
    })
    
    // Aggregate for agents with active listings
    const agentsWithActiveListings = await MLSListing.aggregate([
      { $match: { lifecycleStatus: ListingLifecycle.ACTIVE } },
      { $group: { _id: "$listAgentKey" } },
      { $count: "count" }
    ])
    
    // Aggregate for agents with pending listings
    const agentsWithPendingListings = await MLSListing.aggregate([
      { $match: { lifecycleStatus: ListingLifecycle.PENDING } },
      { $group: { _id: "$listAgentKey" } },
      { $count: "count" }
    ])
    
    // Count listings with null agent keys
    const listingsWithNullAgentKey = await MLSListing.countDocuments({
      listAgentKey: null
    })
    
    // Count listings with agent keys that don't match any agent in the database
    const agentKeys = await MLSAgent.distinct('memberKey')
    const listingsWithInvalidAgentKey = await MLSListing.countDocuments({
      listAgentKey: { $nin: agentKeys, $ne: null }
    })
    
    // Get a sample of agent documents to check their structure
    const sampleAgents = await MLSAgent.find().limit(2)
    
    // Get a sample of listing documents to check their structure
    const sampleListings = await MLSListing.find().limit(2)
    
    // Check for schema mismatches in how statistics are calculated
    const agentWithMostListings = await MLSAgent.findOne().sort({ 'statistics.totalListings': -1 })
    
    return NextResponse.json({
      success: true,
      stats: {
        totalAgents,
        totalListings,
        pendingTransactions,
        activeListings,
        agentsWithActiveListings: agentsWithActiveListings[0]?.count || 0,
        agentsWithPendingListings: agentsWithPendingListings[0]?.count || 0,
        listingsWithNullAgentKey,
        listingsWithInvalidAgentKey
      },
      samples: {
        sampleAgents,
        sampleListings,
        agentWithMostListings
      }
    })
  } catch (error) {
    console.error('Error getting comprehensive stats:', error)
    return NextResponse.json({
      error: 'Failed to get comprehensive stats',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 