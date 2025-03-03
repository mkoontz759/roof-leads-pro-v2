import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing } from '@/lib/models/mls'

const API_KEY = process.env.DEBUG_API_KEY || 'localdev'

/**
 * Debug endpoint to list all real agents in the database
 * This endpoint will:
 * 1. Return basic information for all agents
 * 2. Include listing count statistics for each agent
 * 3. Support filtering by various criteria
 */
export async function GET(request: Request) {
  // Get the API key from query parameters for authentication
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = parseInt(searchParams.get('skip') || '0');
  const city = searchParams.get('city');
  const office = searchParams.get('office');
  const memberType = searchParams.get('memberType');

  // Validate the API key
  if (key !== API_KEY) {
    return NextResponse.json({
      error: 'Invalid API key',
      success: false
    }, { status: 401 });
  }

  try {
    await connectDB();
    
    // Build query filter based on parameters
    const filter: Record<string, any> = {};
    
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }
    
    if (office) {
      filter.officeName = { $regex: office, $options: 'i' };
    }
    
    if (memberType) {
      filter.memberType = { $regex: memberType, $options: 'i' };
    }
    
    // Get total count for pagination
    const totalAgents = await MLSAgent.countDocuments(filter);
    
    // Find agents with pagination
    const agents = await MLSAgent.find(filter)
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get all listing keys for these agents to calculate stats
    const agentKeys = agents.map(agent => agent.memberKey);
    
    // Get all listings for these agents
    const listings = await MLSListing.find({
      listAgentKey: { $in: agentKeys }
    }).lean();
    
    // Group listings by agent
    const listingsByAgent = listings.reduce((result, listing) => {
      const key = listing.listAgentKey;
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(listing);
      return result;
    }, {} as Record<string, any[]>);
    
    // Add statistics to each agent
    const agentsWithStats = agents.map(agent => {
      const agentListings = listingsByAgent[agent.memberKey] || [];
      const activeListings = agentListings.filter(l => l.lifecycleStatus === 'active');
      const pendingListings = agentListings.filter(l => l.lifecycleStatus === 'pending');
      
      return {
        ...agent,
        statistics: {
          totalListings: agentListings.length,
          activeListings: activeListings.length,
          pendingListings: pendingListings.length,
          totalListingValue: agentListings.reduce((sum, l) => sum + (l.listPrice || 0), 0),
          cities: Array.from(new Set(agentListings.map(l => l.city).filter(Boolean)))
        }
      };
    });
    
    // Sort by most listings first
    agentsWithStats.sort((a, b) => b.statistics.totalListings - a.statistics.totalListings);
    
    return NextResponse.json({
      agents: agentsWithStats,
      pagination: {
        total: totalAgents,
        limit,
        skip,
        hasMore: skip + limit < totalAgents
      },
      success: true
    });
  } catch (error) {
    console.error('Error listing real agents:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to list real agents',
      success: false
    }, { status: 500 });
  }
} 