import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { User } from '@/lib/models/user'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'

// Define a proper interface for the user with role
interface UserWithRole {
  _id: string
  email: string
  role: string
  // Add other properties as needed
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const currentUser = await User.findOne({
      email: session.user.email
    }) as unknown as UserWithRole
    
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    
    const { userId } = params
    const { password } = await request.json()
    
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    })
    
    return NextResponse.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}

// Endpoint to complete the password reset
export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB()
    
    const { userId } = params
    const { token, password } = await request.json()
    
    if (!token || !password) {
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
    }
    
    // Find user with valid reset token
    const user = await User.findOne({
      _id: userId,
      resetToken: token,
      resetTokenExpiry: {
        $gt: new Date()
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Update user password and clear reset token
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    })
    
    return NextResponse.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
} 