import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing } from '@/lib/models/mls'

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
    
    // Count listings with null listAgentKey
    const nullAgentCount = await MLSListing.countDocuments({ 
      listAgentKey: null 
    })
    
    // Count total listings
    const totalListings = await MLSListing.countDocuments()
    
    // Sample a few listings with null agent keys
    const sampleListings = await MLSListing.find({ 
      listAgentKey: null 
    })
    .select('listingKey city listPrice mlsStatus lifecycleStatus standardFields.listOfficeName')
    .limit(5)
    
    return NextResponse.json({
      success: true,
      nullAgentCount,
      totalListings,
      percentageWithoutAgents: ((nullAgentCount / totalListings) * 100).toFixed(2) + '%',
      sampleListings
    })
  } catch (error) {
    console.error('Error checking listings without agents:', error)
    return NextResponse.json({
      error: 'Failed to check listings without agents',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 