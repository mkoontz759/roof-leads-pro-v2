import { NextResponse } from 'next/server'
import { connectDB, mongoose } from '@/lib/mongodb'

export async function GET() {
  try {
    const connection = await connectDB()
    
    return NextResponse.json({
      success: true,
      connection: {
        state: mongoose.connection.readyState,
        database: mongoose.connection.db?.databaseName || 'unknown',
        host: mongoose.connection.host || 'unknown'
      }
    })

  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json(
      { 
        error: 'Database test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        env: {
          hasUrl: !!process.env.MONGODB_URI,
          urlLength: process.env.MONGODB_URI?.length
        }
      },
      { status: 500 }
    )
  }
} 