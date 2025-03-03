import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    await connectDB()
    
    // Get User model
    const User = mongoose.models.User || mongoose.model("User", {
      name: String,
      email: { type: String, unique: true },
      role: { type: String, enum: ['USER', 'SUPER_ADMIN', 'SUB_ADMIN'], default: 'USER' }
    })
    
    // Update all ADMIN roles to SUPER_ADMIN
    const result = await User.updateMany(
      { role: 'ADMIN' },
      { $set: { role: 'SUPER_ADMIN' } }
    )

    return NextResponse.json({ 
      message: "Roles migrated successfully", 
      updated: result.modifiedCount
    })
  } catch (error) {
    console.error("Migration Error:", error)
    return NextResponse.json(
      { error: "Failed to migrate roles", details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    )
  }
} 