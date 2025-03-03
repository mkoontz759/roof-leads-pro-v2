import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { logVerificationAttempt } from '@/lib/verification-logger'

export async function POST(req: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(`verify_${session.user.email}`)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: rateLimit.error?.headers
        }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { verificationToken: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Delete existing verification token if it exists
    if (user.verificationToken) {
      await prisma.verificationToken.delete({
        where: { userId: user.id }
      })
    }

    // Generate new verification token
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 3600000) // 24 hours

    // Create new verification token
    const verificationToken = await prisma.verificationToken.create({
      data: {
        token,
        expires,
        userId: user.id
      }
    })

    await sendVerificationEmail(user.email, token)

    await logVerificationAttempt({
      userId: user.id,
      type: 'RESEND',
      status: 'SUCCESS',
      req
    })

    return NextResponse.json({
      success: true,
      message: 'Verification email sent'
    })
  } catch (error) {
    await logVerificationAttempt({
      userId: 'unknown',
      type: 'RESEND',
      status: 'FAILURE',
      error: error instanceof Error ? error.message : 'Unknown error',
      req
    })

    console.error('Resend Verification Error:', error)
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    )
  }
} 