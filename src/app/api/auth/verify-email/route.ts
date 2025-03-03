import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { logVerificationAttempt } from '@/lib/verification-logger'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    const rateLimit = await checkRateLimit(`token_verify_${token}`)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!verificationToken || verificationToken.expires < new Date()) {
      await logVerificationAttempt({
        userId: verificationToken?.userId || 'unknown',
        type: 'VERIFY',
        status: 'FAILURE',
        error: 'Invalid or expired token',
        req
      })

      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() }
    })

    await prisma.verificationToken.delete({
      where: { id: verificationToken.id }
    })

    await logVerificationAttempt({
      userId: verificationToken.userId,
      type: 'VERIFY',
      status: 'SUCCESS',
      req
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email Verification Error:', error)
    
    await logVerificationAttempt({
      userId: 'unknown',
      type: 'VERIFY',
      status: 'FAILURE',
      error: error instanceof Error ? error.message : 'Unknown error',
      req
    })

    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
} 