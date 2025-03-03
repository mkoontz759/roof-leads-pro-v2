import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/user'
import { ZipCode, bulkCreate } from '@/lib/models/zipcode'
import path from 'path'
import fs from 'fs/promises'
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
    const currentUser = await User.findOne({ 
      email: session.user.email 
    }).lean() as unknown as MongoUser | null

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await connectDB()

    // Check if we already have zip codes
    const existingCount = await ZipCode.countDocuments()
    
    if (existingCount > 0) {
      return NextResponse.json({ 
        message: `Database already contains ${existingCount} zip codes` 
      })
    }

    // Read the zip codes JSON file
    const dataPath = path.join(process.cwd(), 'data', 'zip-codes.json')
    const fileContent = await fs.readFile(dataPath, 'utf-8')
    const zipCodes = JSON.parse(fileContent)

    // Bulk insert zip codes
    await bulkCreate(zipCodes)

    return NextResponse.json({ 
      message: `Successfully populated ${zipCodes.length} zip codes` 
    })
  } catch (error) {
    console.error('Error populating zip codes:', error)
    return NextResponse.json(
      { error: 'Failed to populate zip codes' },
      { status: 500 }
    )
  }
} 