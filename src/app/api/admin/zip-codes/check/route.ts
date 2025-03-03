import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ZipCode } from '@/lib/models/zipcode'

export async function GET(req: Request) {
  try {
    await connectDB()
    const count = await ZipCode.countDocuments()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error checking zip codes:', error)
    return NextResponse.json(
      { error: 'Failed to check zip codes' },
      { status: 500 }
    )
  }
} 