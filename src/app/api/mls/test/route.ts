import { NextResponse } from 'next/server'
import { getMLSToken, getNewPendingContracts } from '@/lib/mls-auth'
import { connectDB } from '@/lib/mongodb'
import { MLSListing, MLSAgent } from '@/lib/models/mls'

export async function GET() {
  try {
    console.log('Testing MLS connection...')
    const token = await getMLSToken()
    console.log('Got token:', token)
    
    const { listings, agents } = await getNewPendingContracts(token)
    console.log(`Found ${listings.length} listings and ${agents.length} agents`)

    await connectDB()
    const dbListings = await MLSListing.countDocuments()
    const dbAgents = await MLSAgent.countDocuments()
    console.log(`Database has ${dbListings} listings and ${dbAgents} agents`)

    const recentListings = await MLSListing.countDocuments({
      modificationTimestamp: { 
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
      }
    })
    console.log(`Found ${recentListings} listings modified in last 24 hours`)

    // Check most recent modification
    const mostRecent = await MLSListing.findOne().sort({ modificationTimestamp: -1 })
    console.log('Most recent modification:', mostRecent?.modificationTimestamp)

    // Check modification timestamp distribution
    const modificationStats = await MLSListing.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$modificationTimestamp" 
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 5 }
    ])
    console.log('Recent modifications by date:', modificationStats)

    return NextResponse.json({
      success: true,
      counts: {
        api: { listings: listings.length, agents: agents.length },
        db: { listings: dbListings, agents: dbAgents, recentListings },
        modifications: modificationStats
      }
    })
  } catch (error) {
    console.error('MLS test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 