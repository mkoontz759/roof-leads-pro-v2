import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { adminMiddleware } from '@/middleware/admin'

const ITEMS_PER_PAGE = 10

export async function GET(req: Request) {
  try {
    // Check admin access
    const middlewareResponse = await adminMiddleware(req)
    if (middlewareResponse.status !== 200) {
      return middlewareResponse
    }

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const search = url.searchParams.get('search') || ''
    const type = url.searchParams.get('type') || undefined
    const status = url.searchParams.get('status') || undefined

    const where = {
      OR: search ? [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ] : undefined,
      type: type || undefined,
      status: status || undefined
    }

    const [logs, total] = await Promise.all([
      prisma.verificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      }),
      prisma.verificationLog.count({ where })
    ])

    return NextResponse.json({
      logs,
      totalPages: Math.ceil(total / ITEMS_PER_PAGE)
    })
  } catch (error) {
    console.error('Failed to fetch verification logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
} 