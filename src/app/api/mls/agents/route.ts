import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent } from '@/lib/models/mls'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = (page - 1) * limit
    const searchTerm = searchParams.get('search') || ''
    
    // Build query filters
    const query: any = {}
    
    // Add search functionality
    if (searchTerm) {
      query.$or = [
        { fullName: { $regex: new RegExp(searchTerm, 'i') } },
        { firstName: { $regex: new RegExp(searchTerm, 'i') } },
        { lastName: { $regex: new RegExp(searchTerm, 'i') } },
        { email: { $regex: new RegExp(searchTerm, 'i') } },
        { officeName: { $regex: new RegExp(searchTerm, 'i') } }
      ]
    }
    
    // Execute query
    const total = await MLSAgent.countDocuments(query)
    const agents = await MLSAgent.find(query)
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limit)
    
    return NextResponse.json({
      success: true,
      data: {
        agents,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('MLS Agents API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve agents'
    }, { status: 500 })
  }
} 