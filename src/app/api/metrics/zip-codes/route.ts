import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function calculateZipMetrics(zipCode: string) {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get all transactions for this ZIP code
  const transactions = await prisma.transaction.findMany({
    where: {
      PostalCode: zipCode,
      ModificationTimestamp: {
        gte: thirtyDaysAgo
      }
    }
  })

  // Calculate recent pendings (last 24h)
  const recentPendings = transactions.filter(t => 
    t.StandardStatus === 'Under Contract' && 
    new Date(t.ModificationTimestamp) >= twentyFourHoursAgo
  ).length

  // Calculate total current pendings
  const totalPendings = transactions.filter(t => 
    t.StandardStatus === 'Under Contract'
  ).length

  // Calculate monthly metrics
  const monthlyTransactions = transactions.length

  // Calculate average price
  const averagePrice = transactions.length > 0
    ? transactions.reduce((sum, t) => sum + t.ListPrice, 0) / transactions.length
    : 0

  return {
    zipCode,
    monthlyTransactions,
    averagePrice,
    recentPendings,
    totalPendings,
    lastUpdate: now
  }
}

export async function GET() {
  try {
    // Get unique ZIP codes from transactions
    const uniqueZips = await prisma.transaction.findMany({
      select: {
        PostalCode: true
      },
      distinct: ['PostalCode']
    })

    const metrics = []
    for (const { PostalCode } of uniqueZips) {
      // Calculate metrics for each ZIP code
      const zipMetrics = await calculateZipMetrics(PostalCode)
      
      // Update or create metrics in database
      await prisma.zipCodeMetrics.upsert({
        where: { zipCode: PostalCode },
        update: {
          monthlyTransactions: zipMetrics.monthlyTransactions,
          averagePrice: zipMetrics.averagePrice,
          lastUpdate: zipMetrics.lastUpdate,
          recentPendings: zipMetrics.recentPendings,
          totalPendings: zipMetrics.totalPendings,
          isActive: zipMetrics.monthlyTransactions > 0
        },
        create: {
          zipCode: PostalCode,
          monthlyTransactions: zipMetrics.monthlyTransactions,
          averagePrice: zipMetrics.averagePrice,
          lastUpdate: zipMetrics.lastUpdate,
          recentPendings: zipMetrics.recentPendings,
          totalPendings: zipMetrics.totalPendings,
          isActive: zipMetrics.monthlyTransactions > 0
        }
      })

      metrics.push(zipMetrics)
    }

    return NextResponse.json({ 
      success: true,
      metrics,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to calculate ZIP metrics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate ZIP metrics' },
      { status: 500 }
    )
  }
} 