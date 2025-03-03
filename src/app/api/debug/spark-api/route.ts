import { NextResponse } from 'next/server'
import { searchResidentialListings, ListingStatus } from '@/lib/spark-api'

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const status = (url.searchParams.get('status') || 'Active') as ListingStatus
    
    console.log(`Testing Spark API with page=${page} limit=${limit} status=${status}`)
    
    // Call the searchResidentialListings function
    const response = await searchResidentialListings({
      status,
      page,
      limit
    })
    
    // Return the response data including pagination info
    return NextResponse.json({
      success: true,
      data: {
        results: response.results.length,
        pagination: response.pagination,
        firstListing: response.results[0] || null,
        lastListing: response.results[response.results.length - 1] || null
      }
    })
  } catch (error) {
    console.error('API test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 