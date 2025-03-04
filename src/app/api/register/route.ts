import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'
import { rateLimit } from '@/lib/rate-limit'

// Use the same User schema from auth.ts
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  emailVerified: Date,
  image: String,
  resetToken: String,
  resetTokenExpiry: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  role: { type: String, enum: ["USER", "SUPER_ADMIN", "SUB_ADMIN"], default: "USER" }
})

const User = mongoose.models.User || mongoose.model("User", UserSchema)

// Maximum 5 registration attempts per IP address in a 15-minute window
const MAX_REGISTRATION_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  // Get client IP address
  const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
  
  // Apply rate limiting
  if (!rateLimit(ip, MAX_REGISTRATION_ATTEMPTS, RATE_LIMIT_WINDOW_MS)) {
    console.log(`Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json({ 
      error: 'Too many registration attempts. Please try again later.' 
    }, { status: 429 });
  }
  
  try {
    const { name, email, password } = await request.json()
    
    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Please enter a valid email address' 
      }, { status: 400 })
    }
    
    // Password validation
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }
    
    // Connect to database
    await connectDB()
    
    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Email already in use' 
      }, { status: 409 })
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    // Remove password from response
    const newUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }
    
    console.log('User created successfully:', { id: user._id.toString(), email: user.email })
    
    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ 
      error: 'An error occurred during registration' 
    }, { status: 500 })
  }
} 