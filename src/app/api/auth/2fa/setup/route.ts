import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authenticator } from "otplib"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const secret = authenticator.generateSecret()
    const appName = process.env.APP_NAME || "RoofLeadsPro"
    
    const otpauth = authenticator.keyuri(
      session.user.email,
      appName,
      secret
    )

    await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        tempTwoFactorSecret: secret,
      },
    })

    return NextResponse.json({
      secret,
      qrCode: otpauth,
    })
  } catch (error) {
    console.error("2FA Setup Error:", error)
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    )
  }
} 