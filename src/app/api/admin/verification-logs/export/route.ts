import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { adminMiddleware } from '@/middleware/admin'

export async function GET(req: Request) {
  try {
    // Check admin access
    const middlewareResponse = await adminMiddleware(req)
    if (middlewareResponse.status !== 200) {
      return middlewareResponse
    }

    const logs = await prisma.verificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    })

    // Convert logs to CSV
    const csvRows = [
      ['Time', 'User', 'Email', 'Type', 'Status', 'IP Address', 'Error'].join(','),
      ...logs.map(log => [
        format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        log.user.name || 'Unknown',
        log.user.email,
        log.type,
        log.status,
        log.ipAddress || '',
        log.error || ''
      ].map(field => `"${field}"`).join(','))
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="verification-logs-${format(new Date(), 'yyyy-MM-dd')}.csv"`
      }
    })
  } catch (error) {
    console.error('Failed to export verification logs:', error)
    return NextResponse.json(
      { error: 'Failed to export logs' },
      { status: 500 }
    )
  }
} 