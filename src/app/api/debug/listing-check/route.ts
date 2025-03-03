import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing } from '@/lib/models/mls'

const API_KEY = process.env.API_KEY || 'localdev'

export async function GET(request: Request) {
  try {
    // Authenticate the request
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const listingKey = searchParams.get('listingKey')
    
    if (key !== API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      }, { status: 401 })
    }

    if (!listingKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing listingKey parameter'
      }, { status: 400 })
    }
    
    await connectDB()
    
    // Find the listing
    const listing = await MLSListing.findOne({ listingKey })
    
    if (!listing) {
      return NextResponse.json({
        success: false,
        error: 'Listing not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      listing: {
        listingKey: listing.listingKey,
        listAgentKey: listing.listAgentKey,
        unparsedAddress: listing.unparsedAddress,
        standardFields: listing.standardFields,
        sourceFields: listing.sourceFields,
        city: listing.city,
        stateOrProvince: listing.stateOrProvince,
        postalCode: listing.postalCode,
        listPrice: listing.listPrice,
        lifecycleStatus: listing.lifecycleStatus
      }
    })
    
  } catch (error) {
    console.error('Error checking listing:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 