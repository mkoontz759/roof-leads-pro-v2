import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing } from '@/lib/models/mls'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = (page - 1) * limit
    
    // Build query filters
    const query: any = {}
    
    // Optional filters
    if (searchParams.has('city')) {
      query.city = { $regex: new RegExp(searchParams.get('city') || '', 'i') }
    }
    
    if (searchParams.has('state')) {
      query.stateOrProvince = searchParams.get('state')
    }
    
    if (searchParams.has('zipCode')) {
      query.postalCode = searchParams.get('zipCode')
    }
    
    if (searchParams.has('minPrice')) {
      query.listPrice = { $gte: parseInt(searchParams.get('minPrice') || '0', 10) }
    }
    
    if (searchParams.has('maxPrice')) {
      if (query.listPrice) {
        query.listPrice.$lte = parseInt(searchParams.get('maxPrice') || '10000000', 10)
      } else {
        query.listPrice = { $lte: parseInt(searchParams.get('maxPrice') || '10000000', 10) }
      }
    }
    
    // Add bed and bath filters
    if (searchParams.has('minBeds')) {
      query['standardFields.bedsTotal'] = { $gte: parseInt(searchParams.get('minBeds') || '0', 10) }
    }
    
    if (searchParams.has('maxBeds')) {
      if (query['standardFields.bedsTotal']) {
        query['standardFields.bedsTotal'].$lte = parseInt(searchParams.get('maxBeds') || '10', 10)
      } else {
        query['standardFields.bedsTotal'] = { $lte: parseInt(searchParams.get('maxBeds') || '10', 10) }
      }
    }
    
    if (searchParams.has('minBaths')) {
      query['standardFields.bathsTotal'] = { $gte: parseFloat(searchParams.get('minBaths') || '0') }
    }
    
    if (searchParams.has('maxBaths')) {
      if (query['standardFields.bathsTotal']) {
        query['standardFields.bathsTotal'].$lte = parseFloat(searchParams.get('maxBaths') || '10')
      } else {
        query['standardFields.bathsTotal'] = { $lte: parseFloat(searchParams.get('maxBaths') || '10') }
      }
    }
    
    // Property type filter
    if (searchParams.has('propertyType')) {
      query['standardFields.propertyType'] = searchParams.get('propertyType')
    }
    
    // Status filter
    if (searchParams.has('status')) {
      query['standardFields.standardStatus'] = searchParams.get('status')
    }
    
    // Year built range
    if (searchParams.has('minYear')) {
      query['standardFields.yearBuilt'] = { $gte: parseInt(searchParams.get('minYear') || '1900', 10) }
    }
    
    if (searchParams.has('maxYear')) {
      if (query['standardFields.yearBuilt']) {
        query['standardFields.yearBuilt'].$lte = parseInt(searchParams.get('maxYear') || '2023', 10)
      } else {
        query['standardFields.yearBuilt'] = { $lte: parseInt(searchParams.get('maxYear') || '2023', 10) }
      }
    }
    
    // Add sorting
    const sortField = searchParams.get('sortBy') || 'listPrice'
    const sortDirection = searchParams.get('sortDir') === 'desc' ? -1 : 1
    const sortOptions: any = {}
    
    switch(sortField) {
      case 'price':
        sortOptions.listPrice = sortDirection
        break
      case 'beds':
        sortOptions['standardFields.bedsTotal'] = sortDirection
        break
      case 'baths':
        sortOptions['standardFields.bathsTotal'] = sortDirection
        break
      case 'yearBuilt':
        sortOptions['standardFields.yearBuilt'] = sortDirection
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
    console.error('MLS Listings Search API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to search listings'
    }, { status: 500 })
  }
} 