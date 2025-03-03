import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing } from '@/lib/models/mls'

const API_KEY = process.env.DEBUG_API_KEY || 'localdev'

/**
 * Debug endpoint to clear all fake agents
 * This endpoint will:
 * 1. Delete all agents with keys starting with 'agent-' 
 * 2. Update all listings to remove references to these fake agents
 */
export async function GET(request: Request) {
  // Get the API key from query parameters for authentication
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  // Validate the API key
  if (key !== API_KEY) {
    return NextResponse.json({
      error: 'Invalid API key',
      success: false
    }, { status: 401 });
  }

  try {
    await connectDB();
    
    // Find all fake agents (keys starting with 'agent-')
    const fakeAgents = await MLSAgent.find({
      memberKey: { $regex: '^agent-' }
    }).lean();
    
    const fakeAgentKeys = fakeAgents.map(agent => agent.memberKey);
    console.log(`Found ${fakeAgentKeys.length} fake agents to remove`);
    
    // Delete all fake agents
    const deleteResult = await MLSAgent.deleteMany({
      memberKey: { $in: fakeAgentKeys }
    });
    
    console.log(`Deleted ${deleteResult.deletedCount} fake agents`);
    
    // Update listings to remove references to fake agents
    // Set listAgentKey to null for listings referencing fake agents
    const updateResult = await MLSListing.updateMany(
      { listAgentKey: { $in: fakeAgentKeys } },
      { $set: { listAgentKey: null } }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} listings to remove fake agent references`);
    
    return NextResponse.json({
      message: 'Successfully cleared fake agents',
      removed: {
        agents: deleteResult.deletedCount,
        listingsUpdated: updateResult.modifiedCount
      },
      fakeAgentKeys,
      success: true
    });
  } catch (error) {
    console.error('Error clearing fake agents:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to clear fake agents',
      success: false
    }, { status: 500 });
  }
} 