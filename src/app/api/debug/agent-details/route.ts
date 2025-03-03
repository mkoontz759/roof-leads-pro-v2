import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing, ListingLifecycle } from '@/lib/models/mls'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentKey = searchParams.get('agentKey') || 'agent-amarillo'
    
    await connectDB()
    
    // Find the agent
    const agent = await MLSAgent.findOne({ memberKey: agentKey }).lean()
    
    if (!agent) {
      return NextResponse.json({
        success: false,
        message: `Agent with key ${agentKey} not found`
      }, { status: 404 })
    }
    
    // Find pending listings for this agent
    const pendingListings = await MLSListing.find({
      listAgentKey: agentKey,
      lifecycleStatus: ListingLifecycle.PENDING
    }).lean()
    
    return NextResponse.json({
      success: true,
      agent: {
        memberKey: agent.memberKey,
        fullName: agent.fullName,
        email: agent.email,
        phone: agent.phone,
        officeName: agent.officeName,
        pendingListingsCount: pendingListings.length,
        pendingListingsArray: agent.pendingListings || []
      },
      pendingListings: pendingListings.map(listing => ({
        listingKey: listing.listingKey,
        streetNumberNumeric: listing.streetNumberNumeric,
        streetName: listing.streetName,
        city: listing.city,
        stateOrProvince: listing.stateOrProvince,
        postalCode: listing.standardFields?.postalCode,
        listPrice: listing.listPrice,
        modificationTimestamp: listing.modificationTimestamp
      }))
    })
  } catch (error) {
    console.error('Error getting agent details:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get agent details',
      error: (error as Error).message
    }, { status: 500 })
  }
} 