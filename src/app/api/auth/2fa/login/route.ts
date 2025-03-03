import { getServerSession } from "next-auth/next"
import { authenticator } from "otplib"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA not enabled for this user" },
        { status: 400 }
      )
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret
    })

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("2FA Login Verification Error:", error)
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    )
  }
} 