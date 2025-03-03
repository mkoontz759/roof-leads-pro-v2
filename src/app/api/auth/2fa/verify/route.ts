import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authenticator } from "otplib"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { code, secret } = await request.json()

    if (!code || !secret) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const isValid = authenticator.verify({
      token: code,
      secret,
    })

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.tempTwoFactorSecret !== secret) {
      return NextResponse.json(
        { error: "Invalid setup session" },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        tempTwoFactorSecret: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("2FA Verification Error:", error)
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    )
  }
} 