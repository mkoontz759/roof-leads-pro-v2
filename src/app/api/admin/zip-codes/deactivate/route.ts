import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { Types } from 'mongoose'

interface MongoUser {
  _id: Types.ObjectId
  name: string | null
  email: string | null
  role: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN'
  assignedZipCodes: Array<{
    zipCode: string
    purchaseDate: Date
    active: boolean
  }>
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is super admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    }) as MongoUser | null

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { userId, zipCode } = await req.json()

    if (!userId || !zipCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the user and validate the zip code assignment
    const user = await prisma.user.findUnique({
      where: { id: userId }
    }) as MongoUser | null

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const assignment = user.assignedZipCodes?.find(
      (a: { zipCode: string; active: boolean }) => a.zipCode === zipCode && a.active
    )

    if (!assignment) {
      return NextResponse.json({ error: 'Active zip code assignment not found' }, { status: 404 })
    }

    // Update the zip code assignment to inactive
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        assignedZipCodes: {
          updateMany: {
            where: {
              zipCode: zipCode,
              active: true
            },
            data: {
              active: false
            }
          }
        }
      }
    }) as MongoUser

    // Transform the response
    return NextResponse.json({
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      assignedZipCodes: updatedUser.assignedZipCodes
    })
  } catch (error) {
    console.error('Error deactivating zip code:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate zip code' },
      { status: 500 }
    )
  }
} 