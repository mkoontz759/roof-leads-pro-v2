import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 })
    }
    
    await connectDB()
    
    // Ensure we have a database connection
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error("Failed to connect to database")
    }
    
    const db = mongoose.connection.db
    
    // Get the user's data
    const user = await db.collection('users').findOne({ 
      email: session.user.email 
    })
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }
    
    // Check if the user has assigned zip codes
    const assignedZipCodes = user.assignedZipCodes || []
    const role = user.role || 'USER'
    
    // Check for active zip code assignments
    const activeZipCodes = assignedZipCodes
      .filter((assignment: any) => assignment.active)
      .map((assignment: any) => assignment.zipCode)
    
    // Count agents in these zip codes
    let agentCount = 0
    if (role === 'USER' && activeZipCodes.length > 0) {
      // Count agents with listings in these zip codes
      const agentCountResult = await db.collection('mlsagents').aggregate([
        {
          $lookup: {
            from: 'mlslistings',
            let: { agentKey: '$memberKey' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $toLower: '$listAgentKey' },
                      { $toLower: '$$agentKey' }
                    ]
                  },
                  'standardFields.postalCode': { $in: activeZipCodes }
                }
              }
            ],
            as: 'listings'
          }
        },
        {
          $match: {
            listings: { $ne: [] }
          }
        },
        {
          $count: 'total'
        }
      ]).toArray()
      
      agentCount = agentCountResult[0]?.total || 0
    } else {
      // For admins or users without zip code restrictions
      agentCount = await db.collection('mlsagents').countDocuments()
    }
    
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: role
      },
      zipCodes: {
        total: assignedZipCodes.length,
        active: activeZipCodes.length,
        activeZipCodes: activeZipCodes
      },
      agentCount: agentCount
    })
    
  } catch (error: any) {
    console.error('Error checking zip codes:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 