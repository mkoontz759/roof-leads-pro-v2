import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing } from '@/lib/models/mls'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = (page - 1) * limit
    
    if (!agentId) {
      return NextResponse.json({
        success: false,
        error: 'Agent ID is required'
      }, { status: 400 })
    }
    
    // Build the query to find listings by agent ID
    const query: any = { listAgentKey: agentId }
    
    // Optional filters
    if (searchParams.has('status')) {
      query['standardFields.standardStatus'] = searchParams.get('status')
    }
    
    // Add sorting
    const sortField = searchParams.get('sortBy') || 'listPrice'
    const sortDirection = searchParams.get('sortDir') === 'desc' ? -1 : 1
    const sortOptions: Record<string, number> = {}
    
    switch(sortField) {
      case 'price':
        sortOptions.listPrice = sortDirection
        break
      case 'dateAdded':
        sortOptions._id = sortDirection
        break
      default:
        sortOptions.listPrice = sortDirection
    }
    
    // Execute query
    const total = await MLSListing.countDocuments(query)
    const listings = await MLSListing.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
    
    return NextResponse.json({
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('MLS Agent Listings API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve agent listings'
    }, { status: 500 })
  }
} 