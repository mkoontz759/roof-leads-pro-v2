import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent } from '@/lib/models/mls'
import mongoose from 'mongoose'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const id = params.id
    
    console.log('Looking up agent with ID:', id)
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Agent ID is required'
      }, { status: 400 })
    }
    
    // Check if ID is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id)
    
    let query
    if (isValidObjectId) {
      // If valid ObjectId, search by both _id and memberKey
      query = { $or: [{ _id: id }, { memberKey: id }] }
    } else {
      // If not valid ObjectId, only search by memberKey
      query = { memberKey: id }
    }
    
    const agent = await MLSAgent.findOne(query).lean()
    
    console.log('Agent query result:', agent ? 'Found' : 'Not found')
    
    if (!agent) {
      return NextResponse.json({
        success: false,
        error: 'Agent not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: agent
    })
  } catch (error) {
    console.error('MLS Agent Details API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve agent details',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 