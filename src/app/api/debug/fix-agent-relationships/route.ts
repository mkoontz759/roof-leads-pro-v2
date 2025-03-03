import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing, MLSAgent, MLSSource, MLSAssociation } from '@/lib/models/mls'

const API_KEY = process.env.CRON_SECRET || 'localdev'

/**
 * This endpoint fixes the relationship between agents and listings.
 * It now only uses real data from the API and doesn't generate placeholders.
 */
export async function GET(request: Request) {
  try {
    // Simple API key authentication
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('key')
    
    if (!apiKey || apiKey !== API_KEY) {
      console.log('Unauthorized attempt to access fix-agent-relationships endpoint')
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    console.log('Starting agent relationship fix')
    
    await connectDB()
    
    // Get all listings
    const listings = await MLSListing.find().lean()
    console.log(`Found ${listings.length} listings to process`)
    
    // Process listings and extract real agent information
    const agentMap = new Map()
    const listingsWithoutAgents = []
    
    // First pass - collect real agent information
    listings.forEach(listing => {
      // Extract agent information from sourceFields
      const sourceFields = listing.sourceFields || {}
      
      // Get agent key from sourceFields
      const agentKey = sourceFields.ListAgentId || sourceFields.listAgentId || 
                      sourceFields.ListAgentKey || sourceFields.listAgentKey
      
      // Skip if we don't have a valid agent key
      if (!agentKey) {
        listingsWithoutAgents.push(listing.listingKey)
        return
      }
      
      // Get other agent details
      const listAgentName = sourceFields.ListAgentName || sourceFields.listAgentName || 
                          sourceFields.AgentName || sourceFields.agentName
      
      const listAgentEmail = sourceFields.ListAgentEmail || sourceFields.listAgentEmail || 
                           sourceFields.AgentEmail || sourceFields.agentEmail
      
      const listAgentPhone = sourceFields.ListAgentPhone || sourceFields.listAgentPhone || 
                           sourceFields.AgentPhone || sourceFields.agentPhone
      
      const listOfficeName = sourceFields.ListOfficeName || sourceFields.listOfficeName || 
                           listing.standardFields?.listOfficeName
      
      // Create or update agent entry in our map - only if we have a real name
      if (!agentMap.has(agentKey) && listAgentName) {
        agentMap.set(agentKey, {
          memberKey: agentKey,
          fullName: listAgentName,
          email: listAgentEmail,
          phone: listAgentPhone,
          officeName: listOfficeName,
          source: MLSSource.SPARK,
          sourceId: agentKey,
          association: MLSAssociation.AAR,
          pendingListings: []
        })
      }
    })
    
    // Second pass - associate listings with agents and collect pending listings
    listings.forEach(listing => {
      // Skip listings without valid agent information
      const sourceFields = listing.sourceFields || {}
      const agentKey = sourceFields.ListAgentId || sourceFields.listAgentId || 
                      sourceFields.ListAgentKey || sourceFields.listAgentKey
      
      if (!agentKey || !agentMap.has(agentKey)) {
        return
      }
      
      // Update listing agent key
      listing.listAgentKey = agentKey
      
      // If listing is pending, add to agent's pending listings
      if (listing.lifecycleStatus === 'pending') {
        const agent = agentMap.get(agentKey)
        
        agent.pendingListings.push({
          address: `${listing.streetNumberNumeric || ''} ${listing.streetName || 'Unknown Address'} in ${listing.city}`.trim(),
          city: listing.city || '',
          state: listing.stateOrProvince || '',
          zipCode: listing.standardFields?.postalCode || '',
          pendingDate: new Date(),
          listPrice: listing.listPrice || 0
        })
      }
    })
    
    // Now upsert agents with real information only
    const uniqueAgents = Array.from(agentMap.values())
    console.log(`Found ${uniqueAgents.length} unique agents with valid data`)
    
    // Batch upsert agents
    if (uniqueAgents.length > 0) {
      await MLSAgent.bulkWrite(uniqueAgents.map(agent => ({
        updateOne: {
          filter: { memberKey: agent.memberKey },
          update: { $set: agent },
          upsert: true
        }
      })))
    }
    
    // Update listings with correct agent keys
    if (listings.length > 0) {
      await MLSListing.bulkWrite(listings.filter(listing => {
        const sourceFields = listing.sourceFields || {}
        const agentKey = sourceFields.ListAgentId || sourceFields.listAgentId || 
                        sourceFields.ListAgentKey || sourceFields.listAgentKey
        return agentKey && agentMap.has(agentKey)
      }).map(listing => {
        const sourceFields = listing.sourceFields || {}
        const agentKey = sourceFields.ListAgentId || sourceFields.listAgentId || 
                        sourceFields.ListAgentKey || sourceFields.listAgentKey
        
        return {
          updateOne: {
            filter: { listingKey: listing.listingKey },
            update: { $set: { listAgentKey: agentKey } },
            upsert: false
          }
        }
      }))
    }
    
    return NextResponse.json({
      success: true,
      message: 'Agent relationships fixed successfully',
      stats: {
        totalListings: listings.length,
        totalUniqueAgents: uniqueAgents.length,
        listingsWithoutAgents: listingsWithoutAgents.length,
        agentsUpserted: uniqueAgents.length
      }
    })
    
  } catch (error) {
    console.error('Error fixing agent relationships:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fix agent relationships',
      error: (error as Error).message
    }, { status: 500 })
  }
} 