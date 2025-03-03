import { NextResponse } from 'next/server'
import { getMLSToken, getNewPendingContracts } from '@/lib/mls-auth'

export async function GET() {
  try {
    const token = await getMLSToken()
    const { listings, agents } = await getNewPendingContracts(token)
    
    return NextResponse.json({
      success: true,
      data: { listings, agents }
    })
  } catch (error) {
    console.error('MLS API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch MLS data'
    }, { status: 500 })
  }
} 