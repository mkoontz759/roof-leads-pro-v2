import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      select: {
        id: true,
        email: true,
        name: true,
        password: true, // Check if password exists
        twoFactorEnabled: true,
        twoFactorSecret: true,
      }
    })
    
    return NextResponse.json({ 
      success: true,
      user: {
        ...user,
        hasPassword: !!user?.password, // Send boolean instead of actual password
      }
    })
  } catch (error) {
    console.error("Error fetching test user:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch test user",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
} 