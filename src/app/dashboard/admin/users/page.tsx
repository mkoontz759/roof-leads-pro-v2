import { Metadata } from "next"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/db"
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { UserManagement } from './user-management'

export const metadata: Metadata = {
  title: "User Management | Roof Leads Pro",
  description: "Manage users, roles, and subscriptions",
}

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      image: true,
      assignedZipCodes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  return users
}

export default async function UsersPage() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
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
    where: { email: session.user.email }
  })

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
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
      <h1 className="text-2xl font-bold mb-8">User Management</h1>
      
      <div className="space-y-8">
        <Suspense fallback={<Skeleton className="h-[600px]" />}>
          <UserManagement users={users} />
        </Suspense>
      </div>
    </div>
  )
} 