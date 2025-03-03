import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  try {
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Call the sync endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/mls/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      result
    })

  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 