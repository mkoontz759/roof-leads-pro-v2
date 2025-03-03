import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing } from '@/lib/models/mls'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    // Get all unique cities
    const cities = await MLSListing.distinct('city')
    
    // Sort cities alphabetically
    cities.sort()
    
    return NextResponse.json({
      success: true,
      data: cities
    })
  } catch (error) {
    console.error('MLS Cities API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve cities'
    }, { status: 500 })
  }
} 