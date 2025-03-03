import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/user'

export async function GET() {
  try {
    // Connect to the database
    await connectDB()
    
    // Count documents
    const userCount = await User.countDocuments()
    
    // Get a sample user (without sensitive data)
    const sampleUser: any = await User.findOne().select('-password -resetToken -twoFactorSecret -backupCodes').lean()
    
    return NextResponse.json({
      success: true,
      counts: {
        users: userCount
      },
      sample: sampleUser ? {
        id: sampleUser._id?.toString(),
        email: sampleUser.email,
        role: sampleUser.role
      } : null
    })

  } catch (error) {
    console.error('User test failed:', error)
    return NextResponse.json(
      { 
        error: 'User test failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 