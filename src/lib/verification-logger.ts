import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import type { Prisma } from '@prisma/client'

export type VerificationType = 'SEND' | 'VERIFY' | 'RESEND'
export type VerificationStatus = 'SUCCESS' | 'FAILURE'

interface LogVerificationParams {
  userId: string
  type: VerificationType
  status: VerificationStatus
  error?: string
  req?: Request
}

export async function logVerificationAttempt({
  userId,
  type,
  status,
  error,
  req
}: LogVerificationParams) {
  try {
    const headersList = headers()
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    const data: Prisma.VerificationLogCreateInput = {
      user: {
        connect: { id: userId }
      },
      type,
      status,
      ipAddress,
      userAgent,
      error
    }

    await prisma.verificationLog.create({ data })
  } catch (error) {
    console.error('Failed to log verification attempt:', error)
  }
}

export async function getVerificationAttempts(userId: string) {
  return prisma.verificationLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  })
} 