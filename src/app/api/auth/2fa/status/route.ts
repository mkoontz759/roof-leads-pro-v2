import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userSelect = {
      id: true,
      twoFactorEnabled: true
    } satisfies Prisma.UserSelect

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: userSelect
    })

    return NextResponse.json({
      enabled: Boolean(user?.twoFactorEnabled)
    })
  } catch (error) {
    console.error('2FA Status Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch 2FA status' },
      { status: 500 }
    )
  }
} 