import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing } from '@/lib/models/mls'
import mongoose from 'mongoose'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const id = params.id
    
    console.log('Looking up listing with ID:', id)
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Listing ID is required'
      }, { status: 400 })
    }
    
    // Check if ID is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id)
    
    let query
    if (isValidObjectId) {
      // If valid ObjectId, search by both _id and listingKey
      query = { $or: [{ _id: id }, { listingKey: id }] }
    } else {
      // If not valid ObjectId, only search by listingKey
      query = { listingKey: id }
    }
    
    const listing = await MLSListing.findOne(query).lean()
    
    console.log('Listing query result:', listing ? 'Found' : 'Not found')
    
    if (!listing) {
      return NextResponse.json({
        success: false,
        error: 'Listing not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: listing
    })
  } catch (error) {
    console.error('MLS Listing Details API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve listing details',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 