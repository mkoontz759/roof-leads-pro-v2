import { NextResponse } from 'next/server'
import { getCleanupSchedule, setCleanupSchedule } from '@/lib/services/cleanup-schedule'

export async function GET() {
  try {
    const schedule = await getCleanupSchedule()
    return NextResponse.json({ success: true, schedule })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get cleanup schedule' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const schedule = await request.json()
    const updatedSchedule = await setCleanupSchedule(schedule)
    return NextResponse.json({ success: true, schedule: updatedSchedule })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update cleanup schedule' },
      { status: 500 }
    )
  }
} 