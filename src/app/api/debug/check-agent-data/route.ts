import { NextResponse } from 'next/server'
import { searchListings, ListingStatus } from '@/lib/spark-api'
import { MLSSource } from '@/lib/models/mls'

const API_KEY = process.env.CRON_SECRET || 'localdev'

/**
 * This endpoint fetches a sample listing from the Spark API and shows
 * all available fields related to agents for debugging purposes
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
    
    // Fetch a few listings to analyze their agent data
    const result = await searchListings({
      _limit: 5,
      _page: 1,
      status: ListingStatus.Active
    })
    
    const listings = result.D?.Results || []
    
    if (listings.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No listings found'
      })
    }
    
    // Extract all agent-related fields for each listing
    const agentData = listings.map(listing => {
      // Collect all fields that might be related to agents
      const agentFields: Record<string, any> = {}
      
      // Look for any fields that might contain agent information
      Object.entries(listing).forEach(([key, value]) => {
        if (key.toLowerCase().includes('agent') || 
            key.toLowerCase().includes('office') ||
            key.toLowerCase().includes('member')) {
          agentFields[key] = value
        }
      })
      
      // Check standard fields too
      const standardAgentFields: Record<string, any> = {}
      if (listing.StandardFields) {
        Object.entries(listing.StandardFields).forEach(([key, value]) => {
          if (key.toLowerCase().includes('agent') || 
              key.toLowerCase().includes('office') ||
              key.toLowerCase().includes('member')) {
            standardAgentFields[key] = value
          }
        })
      }
      
      return {
        listingId: listing.Id,
        agentFields,
        standardAgentFields
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Agent data analysis completed',
      sampleCount: listings.length,
      agentData
    })
  } catch (error) {
    console.error('Error analyzing agent data:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to analyze agent data',
      error: (error as Error).message
    }, { status: 500 })
  }
} 