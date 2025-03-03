import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"

// Define User schema if needed
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  emailVerified: Date,
  image: String,
  resetToken: String,
  resetTokenExpiry: Date,
  verificationToken: {
    token: String,
    expires: Date
  },
  twoFactorEnabled: Boolean,
  twoFactorSecret: String,
  tempTwoFactorSecret: String,
  backupCodes: [String],
  role: { type: String, enum: ['USER', 'SUPER_ADMIN', 'SUB_ADMIN'], default: 'USER' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    await connectDB()
    
    // Get User model
    const User = mongoose.models.User || mongoose.model("User", UserSchema)
    
    const hashedPassword = await bcrypt.hash("test123", 10)
    
    // Check if user exists
    let user = await User.findOne({ email: "test@example.com" })
    
    if (user) {
      // Update existing user
      user.password = hashedPassword
      user.name = "Test User"
      user.role = "SUPER_ADMIN" // Ensure the user is a super admin
      await user.save()
    } else {
      // Create new user
      user = new User({
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
        role: "SUPER_ADMIN" // Make the test user a super admin
      })
      await user.save()
    }

    return NextResponse.json({ 
      message: "Test user created/updated", 
      userId: user._id.toString(),
      credentials: {
        email: "test@example.com",
        password: "test123" // Only for development!
      }
    })
  } catch (error) {
    console.error("Setup Error:", error)
    return NextResponse.json(
      { error: "Failed to create/update test user", details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    )
  }
} 