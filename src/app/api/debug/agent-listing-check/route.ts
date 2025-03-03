import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing, ListingLifecycle } from '@/lib/models/mls'

const API_KEY = process.env.CRON_SECRET || 'localdev'

/**
 * Debug endpoint to check the relationship between agents and listings
 * Verifies that each listing is correctly associated with its agent
 */
export async function GET(request: Request) {
  try {
    // Simple API key authentication
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('key')
    
    if (!apiKey || apiKey !== API_KEY) {
      console.log('Unauthorized attempt to access debug endpoint')
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    await connectDB()
    
    // Get counts
    const totalAgents = await MLSAgent.countDocuments()
    const totalListings = await MLSListing.countDocuments()
    const pendingListings = await MLSListing.countDocuments({ lifecycleStatus: ListingLifecycle.PENDING })
    const activeListings = await MLSListing.countDocuments({ lifecycleStatus: ListingLifecycle.ACTIVE })
    
    // Get a sample of listings to check their agent associations
    const sampleListings = await MLSListing.find()
      .limit(10)
      .lean()
    
    // Check agent associations
    const listingAgentChecks = []
    
    for (const listing of sampleListings) {
      const agent = await MLSAgent.findOne({ 
        memberKey: listing.listAgentKey 
      })
      .select('memberKey fullName')
      .lean()
      
      listingAgentChecks.push({
        listingKey: listing.listingKey,
        listAgentKey: listing.listAgentKey,
        agentFound: !!agent,
        agentName: agent?.fullName || 'Not Found',
        listingCity: listing.city
      })
    }
    
    // Find agents with most listings
    const topAgents = await MLSAgent.aggregate([
      {
        $lookup: {
          from: 'mlslistings',
          let: { agentKey: '$memberKey' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$listAgentKey', '$$agentKey']
                }
              }
            }
          ],
          as: 'listings'
        }
      },
      {
        $match: {
          'listings.0': { $exists: true }
        }
      },
      {
        $project: {
          memberKey: 1,
          fullName: 1, 
          listingCount: { $size: '$listings' }
        }
      },
      {
        $sort: { listingCount: -1 }
      },
      {
        $limit: 5
      }
    ])
    
    // Find agents with no listings
    const agentsWithNoListings = await MLSAgent.aggregate([
      {
        $lookup: {
          from: 'mlslistings',
          let: { agentKey: '$memberKey' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$listAgentKey', '$$agentKey']
                }
              }
            }
          ],
          as: 'listings'
        }
      },
      {
        $match: {
          'listings.0': { $exists: false }
        }
      },
      {
        $project: {
          memberKey: 1,
          fullName: 1
        }
      },
      {
        $limit: 5
      }
    ])
    
    return NextResponse.json({
      success: true,
      counts: {
        totalAgents,
        totalListings,
        pendingListings,
        activeListings,
        agentsWithPendingListings: 'Calculating...'
      },
      sampleAgentListingRelationships: listingAgentChecks,
      topAgentsWithPendings: topAgents,
      sampleAgentsWithoutPendings: agentsWithNoListings,
      message: 'Database check completed'
    })
  } catch (error) {
    console.error('Error in agent-listing check:', error)
    return NextResponse.json({
      success: false,
      message: 'Error checking agent-listing relationships',
      error: (error as Error).message
    }, { status: 500 })
  }
} 