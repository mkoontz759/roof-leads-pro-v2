import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { SyncHistory } from '@/lib/models/sync-history'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const status = searchParams.get('status')
    
    const query = status && status !== 'all' ? { status } : {}
    
    const [syncs, total] = await Promise.all([
      SyncHistory.find(query)
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SyncHistory.countDocuments(query)
    ])

    return NextResponse.json({
      syncs,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    })

  } catch (error) {
    console.error('Failed to fetch sync history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    )
  }
} 