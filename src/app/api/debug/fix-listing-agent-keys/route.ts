import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing, MLSAgent } from '@/lib/models/mls'

const API_KEY = process.env.API_KEY || 'localdev'

export async function GET(request: Request) {
  try {
    // Authenticate the request
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (key !== API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      }, { status: 401 })
    }
    
    console.log('Starting listing agent key fix...')
    await connectDB()
    
    // Get all agents and create a map of their memberKeys
    const agents = await MLSAgent.find().lean()
    const agentKeys = new Set(agents.map(agent => agent.memberKey))
    console.log(`Found ${agents.length} agents with valid memberKeys`)
    
    // Get all listings with invalid agent keys
    const listings = await MLSListing.find({
      listAgentKey: { $regex: /^listing-/ }
    }).lean()
    
    console.log(`Found ${listings.length} listings with invalid agent keys`)
    
    // Process each listing
    const updates = []
    for (const listing of listings) {
      // Extract the numeric part from the listing key (e.g., "25-357" from "listing-25-357")
      const match = listing.listAgentKey.match(/listing-(\d+-\d+)/)
      if (!match) continue
      
      const listingKey = match[1]
      
      // Find the agent that has this listing in their memberKey
      const agent = agents.find(a => a.memberKey.includes(listingKey))
      if (agent) {
        updates.push({
          updateOne: {
            filter: { listingKey: listing.listingKey },
            update: { $set: { listAgentKey: agent.memberKey } }
          }
        })
      }
    }
    
    // Apply updates in batches
    if (updates.length > 0) {
      await MLSListing.bulkWrite(updates)
      console.log(`Updated ${updates.length} listings with correct agent keys`)
    }
    
    return NextResponse.json({
      success: true,
      stats: {
        totalAgents: agents.length,
        totalListingsProcessed: listings.length,
        listingsUpdated: updates.length
      }
    })
    
  } catch (error: any) {
    console.error('Error fixing listing agent keys:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred while fixing listing agent keys'
    }, { status: 500 })
  }
} 