import { Metadata } from "next"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/db"
import { ZipCodeManagement } from "./zip-code-management"
import { Types } from 'mongoose'
import { Suspense } from 'react'
import { ZipCodePurchase } from './zip-code-purchase'
import { ZipCodeList } from './zip-code-list'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: "Zip Code Management | Roof Leads Pro",
  description: "Manage zip code assignments and subscriptions",
}

interface ZipCodeAssignment {
  zipCode: string
  purchaseDate: Date
  active: boolean
}

interface User {
  id: string
  name: string | null
  email: string
  role: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN'
  assignedZipCodes: ZipCodeAssignment[]
}

interface MongoUser {
  _id: Types.ObjectId
  name: string | null
  email: string | null
  role: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN'
  assignedZipCodes: ZipCodeAssignment[]
}

async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({
    select: {
      _id: true,
      name: true,
      email: true,
      role: true,
      assignedZipCodes: true
    }
  }) as unknown as MongoUser[]

  return users.map(user => ({
    id: user._id.toString(),
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'USER',
    assignedZipCodes: user.assignedZipCodes || []
  }))
}

async function getZipCodeAssignments() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      assignedZipCodes: true,
    },
    where: {
      assignedZipCodes: {
        $exists: true,
        $not: { $size: 0 }
      }
    }
  })
  return users
}

export default async function ZipCodesPage() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Zip Code Management</h1>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Not authenticated</h2>
          <p className="text-muted-foreground">
            Please sign in to access this page.
          </p>
        </div>
      </div>
    )
  }

  // Check if user is super admin
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  }) as { role: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN' } | null

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Zip Code Management</h1>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access this page. Your current role is: {currentUser?.role || 'unknown'}
          </p>
        </div>
      </div>
    )
  }

  const users = await getUsers()

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Zip Code Management</h1>
      
      <div className="space-y-8">
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Purchase Zip Code</h2>
          <Suspense fallback={<Skeleton className="h-20" />}>
            <ZipCodePurchase user={session.user} />
          </Suspense>
        </div>

        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Assigned Zip Codes</h2>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ZipCodeList users={users} />
          </Suspense>
        </div>

        <Suspense fallback={<Skeleton className="h-[600px]" />}>
          <ZipCodeManagement users={users} />
        </Suspense>
      </div>
    </div>
  )
} 