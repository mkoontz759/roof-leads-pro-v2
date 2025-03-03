import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { userId, zipCode } = await req.json()

    if (!userId || !zipCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate zip code format
    if (!/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: 'Invalid zip code format' }, { status: 400 })
    }

    // Check if zip code is already assigned and active
    const existingAssignment = await prisma.user.findFirst({
      where: {
        assignedZipCodes: {
          some: {
            zipCode: zipCode,
            active: true
          }
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json({ error: 'Zip code is already assigned to another user' }, { status: 400 })
    }

    // Get the user to assign the zip code to
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Process the purchase (in a real app, you'd integrate with a payment processor here)
    // For now, we'll just assign the zip code
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        assignedZipCodes: {
          push: {
            zipCode: zipCode,
            purchaseDate: new Date(),
            active: true
          }
        }
      }
    })

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to assign zip code' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Zip code purchased and assigned successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error in zip code purchase:', error)
    return NextResponse.json(
      { error: 'Failed to process zip code purchase' },
      { status: 500 }
    )
  }
} 