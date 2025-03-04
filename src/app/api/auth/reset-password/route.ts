import { NextResponse } from 'next/server'
import { findFirst, update } from '@/lib/models/user'
import { hash } from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'

// Define an interface for the user object
interface UserDocument {
  _id: any;
  [key: string]: any;
}

export async function POST(req: Request) {
  try {
    await connectDB()
    const { token, password } = await req.json()

    const user = await findFirst({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    }) as unknown as UserDocument;

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    const hashedPassword = await hash(password, 10)

    await update(
      { id: user._id.toString() },
      { 
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
} 