import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing } from '@/lib/models/mls'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    // Get counts by status
    const statusCounts = await MLSListing.aggregate([
      {
        $group: {
          _id: '$standardFields.standardStatus',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ])
    
    // Get counts by city (top 10)
    const cityCounts = await MLSListing.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          city: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ])
    
    // Get counts by property type
    const propertyTypeCounts = await MLSListing.aggregate([
      {
        $group: {
          _id: '$standardFields.propertyType',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          propertyType: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ])
    
    // Get price ranges
    const priceStats = await MLSListing.aggregate([
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$listPrice' },
          minPrice: { $min: '$listPrice' },
          maxPrice: { $max: '$listPrice' }
        }
      },
      {
        $project: {
          _id: 0
        }
      }
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        statusCounts,
        cityCounts,
        propertyTypeCounts,
        priceStats: priceStats[0] || {}
      }
    })
  } catch (error) {
    console.error('MLS Analytics API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve listing analytics'
    }, { status: 500 })
  }
} 