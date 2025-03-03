import { NextResponse } from 'next/server'
import * as UserModel from '@/lib/models/user'
import { hash } from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    const user = await UserModel.findUnique({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    const hashedPassword = await hash(password, 10)

    await UserModel.update(
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