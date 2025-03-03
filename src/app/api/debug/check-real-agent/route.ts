import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing } from '@/lib/models/mls'

const API_KEY = process.env.DEBUG_API_KEY || 'localdev'

/**
 * Debug endpoint to check details for a specific real agent
 * This endpoint will:
 * 1. Return the agent's details
 * 2. Show all listings associated with this agent
 * 3. Calculate statistics for the agent
 */
export async function GET(request: Request) {
  // Get the API key from query parameters for authentication
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const memberKey = searchParams.get('memberKey');

  // Validate the API key
  if (key !== API_KEY) {
    return NextResponse.json({
      error: 'Invalid API key',
      success: false
    }, { status: 401 });
  }

  // Require memberKey parameter
  if (!memberKey) {
    return NextResponse.json({
      error: 'Missing memberKey parameter',
      message: 'Please provide a memberKey to check agent details',
      success: false
    }, { status: 400 });
  }

  try {
    await connectDB();
    
    // Find the agent by memberKey
    const agent = await MLSAgent.findOne({
      memberKey: memberKey
    }).lean();
    
    if (!agent) {
      return NextResponse.json({
        error: 'Agent not found',
        message: `No agent found with memberKey: ${memberKey}`,
        success: false
      }, { status: 404 });
    }
    
    // Find all listings associated with this agent
    const listings = await MLSListing.find({
      listAgentKey: memberKey
    }).lean();
    
    // Calculate agent statistics
    const stats = {
      totalListings: listings.length,
      activeListings: listings.filter(l => l.lifecycleStatus === 'active').length,
      pendingListings: listings.filter(l => l.lifecycleStatus === 'pending').length,
      totalListingValue: listings.reduce((sum, l) => sum + (l.listPrice || 0), 0),
      avgListingPrice: listings.length > 0 
        ? listings.reduce((sum, l) => sum + (l.listPrice || 0), 0) / listings.length 
        : 0,
      cities: Array.from(new Set(listings.map(l => l.city).filter(Boolean))),
      recentActivity: listings
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 5)
        .map(l => ({
          listingKey: l.listingKey,
          city: l.city,
          price: l.listPrice,
          status: l.lifecycleStatus,
          updatedAt: l.updatedAt
        }))
    };
    
    return NextResponse.json({
      agent,
      stats,
      sampleListings: listings.slice(0, 10).map(l => ({
        listingKey: l.listingKey,
        city: l.city,
        price: l.listPrice,
        status: l.lifecycleStatus,
        updatedAt: l.updatedAt
      })),
      success: true
    });
  } catch (error) {
    console.error('Error checking real agent:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check real agent details',
      success: false
    }, { status: 500 });
  }
} 