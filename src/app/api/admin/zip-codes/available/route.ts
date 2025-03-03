import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/user'
import mongoose from 'mongoose'
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()
    console.log('Connected to database')

    // Check if user is super admin
    const currentUser = await User.findOne({ 
      email: session.user.email 
    }).lean() as unknown as MongoUser | null

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    console.log('User authorized as super admin')

    // Get all unique zip codes from mlslistings
    const mlsListings = mongoose.connection.collection('mlslistings')
    const uniqueZipCodes = await mlsListings.distinct('standardFields.postalCode', {
      'standardFields.postalCode': { $exists: true, $ne: '' }
    })
    console.log('Total unique zip codes found:', uniqueZipCodes.length)
    console.log('Sample zip codes:', uniqueZipCodes.slice(0, 5))

    // Get all currently assigned active zip codes
    const assignedZipCodes = await User.find({
      'assignedZipCodes': {
        $elemMatch: {
          active: true
        }
      }
    }, {
      'assignedZipCodes': {
        $elemMatch: {
          active: true
        }
      }
    }).lean() as unknown as MongoUser[]

    // Create a set of assigned zip codes for quick lookup
    const assignedZipCodeSet = new Set(
      assignedZipCodes.flatMap(user => 
        (user.assignedZipCodes || []).map((assignment: { zipCode: string }) => assignment.zipCode)
      )
    )
    console.log('Number of assigned zip codes:', assignedZipCodeSet.size)

    // Get city and state for each zip code
    const zipCodeDetails = await mlsListings.aggregate([
      { 
        $match: { 
          'standardFields.postalCode': { $in: uniqueZipCodes },
          'standardFields.city': { $exists: true },
          'standardFields.stateOrProvince': { $exists: true }
        } 
      },
      { 
        $group: {
          _id: '$standardFields.postalCode',
          city: { $first: '$standardFields.city' },
          state: { $first: '$standardFields.stateOrProvince' }
        }
      }
    ]).toArray()
    console.log('Zip codes with details found:', zipCodeDetails.length)
    console.log('Sample zip code details:', zipCodeDetails.slice(0, 2))

    // Format the response and filter out assigned zip codes
    const availableZipCodes = zipCodeDetails
      .filter(zipCode => !assignedZipCodeSet.has(zipCode._id))
      .map(zipCode => ({
        code: zipCode._id,
        city: zipCode.city,
        state: zipCode.state
      }))

    console.log('Final available zip codes:', availableZipCodes.length)
    console.log('Sample available zip codes:', availableZipCodes.slice(0, 2))

    return NextResponse.json(availableZipCodes)
  } catch (error) {
    console.error('Error fetching available zip codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available zip codes' },
      { status: 500 }
    )
  }
} 