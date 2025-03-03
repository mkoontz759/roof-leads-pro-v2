import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function POST(req: Request) {
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
      twoFactorEnabled: true,
    } satisfies Prisma.UserSelect

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: userSelect
    })

    if (!user?.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA Disable Error:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
} 