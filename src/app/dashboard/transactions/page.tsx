import { connectDB } from '@/lib/mongodb'
import { MLSListing, ListingLifecycle } from '@/lib/models/mls'
import { TransactionFilters } from './transaction-filters'
import { TransactionsTable } from './transactions-table'
import { PageSizeSelector } from '../agents/page-size-selector'
import { Pagination } from './pagination'
import { TransactionFiltersWrapper } from './transaction-filters-wrapper'
import { Suspense } from 'react'
import { TableSkeleton } from './loading-skeleton'
import { MLSAgent } from '@/lib/models/mls'
import mongoose from 'mongoose'
import { StatsCards } from './stats-cards'

async function getTransactions(
  timeFrame: string = 'all',
  priceRange: string = 'all',
  zipCode: string = 'all',
  searchQuery: string = '',
  sortField: string = 'modificationTimestamp',
  sortOrder: 'asc' | 'desc' = 'desc',
  page: number = 1,
  pageSize: number = 24
) {
  await connectDB()

  const query: any = {
    lifecycleStatus: ListingLifecycle.PENDING // Using the enum for type safety
  }

  // Add time frame filter
  if (timeFrame !== 'all') {
    const now = new Date()
    let startDate = new Date()

    switch (timeFrame) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24)
        break
      case '3d':
        startDate.setDate(startDate.getDate() - 3)
        break
      case '1w':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        query.modificationTimestamp = { 
          $gte: startDate,
          $lte: endOfLastMonth
        }
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }

    if (!query.modificationTimestamp) {
      query.modificationTimestamp = { $gte: startDate }
    }
  }

  // Add price range filter
  if (priceRange !== 'all') {
    const [min, max] = priceRange.split('-').map(Number)
    query['standardFields.listPrice'] = { $gte: min }
    if (max) query['standardFields.listPrice'].$lte = max
  }

  // Add zip code filter
  if (zipCode !== 'all') {
    query['standardFields.postalCode'] = zipCode
  }

  const skip = (page - 1) * pageSize

  // Build the pipeline
  const pipeline: any[] = [
    { $match: query },
    {
      $lookup: {
        from: 'mlsagents',
        localField: 'listAgentKey',
        foreignField: 'memberKey',
        as: 'agent'
      }
    },
    {
      $unwind: {
        path: '$agent',
        preserveNullAndEmptyArrays: true
      }
    }
  ]

  // Add search if exists
  if (searchQuery) {
    const searchRegex = new RegExp(searchQuery, 'i')
    pipeline.push({
      $match: {
        $or: [
          { 'standardFields.streetName': { $regex: searchRegex } },
          { 'standardFields.city': { $regex: searchRegex } },
          { 'agent.fullName': { $regex: searchRegex } }
        ]
      }
    })
  }

  // Add sort
  const sortStage: any = {}
  if (sortField === 'listPrice') {
    sortStage['standardFields.listPrice'] = sortOrder === 'asc' ? 1 : -1
  } else if (sortField === 'streetName') {
    sortStage['standardFields.streetName'] = sortOrder === 'asc' ? 1 : -1
  } else if (sortField === 'city') {
    sortStage['standardFields.city'] = sortOrder === 'asc' ? 1 : -1
  } else if (sortField === 'postalCode') {
    sortStage['standardFields.postalCode'] = sortOrder === 'asc' ? 1 : -1
  } else {
    sortStage[sortField] = sortOrder === 'asc' ? 1 : -1
  }
  pipeline.push({ $sort: sortStage })

  // Add pagination
  pipeline.push({ $skip: skip })
  pipeline.push({ $limit: pageSize })

  // Execute aggregation
  const transactions = await MLSListing.aggregate(pipeline)

  // Get total count for pagination
  const countPipeline: any[] = [
    { $match: query }
  ]

  if (searchQuery) {
    const searchRegex = new RegExp(searchQuery, 'i')
    countPipeline.push({
      $lookup: {
        from: 'mlsagents',
        localField: 'listAgentKey',
        foreignField: 'memberKey',
        as: 'agent'
      }
    })
    countPipeline.push({
      $unwind: {
        path: '$agent',
        preserveNullAndEmptyArrays: true
      }
    })
    countPipeline.push({
      $match: {
        $or: [
          { 'standardFields.streetName': { $regex: searchRegex } },
          { 'standardFields.city': { $regex: searchRegex } },
          { 'agent.fullName': { $regex: searchRegex } }
        ]
      }
    })
  }

  countPipeline.push({ $count: 'total' })
  const countResult = await MLSListing.aggregate(countPipeline)
  const total = countResult[0]?.total || 0

  // Get quick stats
  const conn = mongoose.connection
  const db = conn.db
  
  if (!db) {
    throw new Error('Database connection is not established')
  }

  // Get total pending value
  const aggregate = [
    {
      $match: {
        'standardFields.standardStatus': ListingLifecycle.PENDING,
        'standardFields.postalCode': { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: null,
        totalValue: { $sum: '$standardFields.listPrice' },
        count: { $sum: 1 },
        uniqueAgents: { $addToSet: '$listAgentKey' },
        uniqueZipCodes: { $addToSet: '$standardFields.postalCode' }
      }
    }
  ]

  const [result] = await MLSListing.aggregate(aggregate)

  // Get last sync date
  const lastSyncDoc = await mongoose.connection.collection('synchistories')
    .findOne({}, { sort: { endTime: -1 } });

  const lastSyncedAt = lastSyncDoc?.endTime || new Date();

  return {
    transactions: transactions.map(serializeDocument),
    pagination: {
      total,
      pageCount: Math.ceil(total / pageSize),
      page,
      pageSize
    },
    stats: {
      totalTransactions: result?.count || 0,
      totalValue: result?.totalValue || 0,
      uniqueAgents: result?.uniqueAgents?.length || 0,
      uniqueZipCodes: result?.uniqueZipCodes?.length || 0,
      lastSyncedAt: lastSyncedAt
    }
  }
}

const serializeDocument = (doc: any) => {
  if (!doc) return doc
  
  const result: any = {}
  
  // Convert MongoDB ObjectIds to strings for all keys
  for (const [key, value] of Object.entries(doc)) {
    if (value instanceof mongoose.Types.ObjectId) {
      result[key] = value.toString()
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = serializeDocument(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' && item !== null ? serializeDocument(item) : item
      )
    } else {
      result[key] = value
    }
  }
  
  return result
}

async function getUniqueZipCodesWithCounts() {
  await connectDB()
  
  // Get all unique zip codes where there are pending listings
  const pipeline = [
    {
      $match: {
        'standardFields.standardStatus': ListingLifecycle.PENDING,
        'standardFields.postalCode': { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: '$standardFields.postalCode',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 } as Record<string, -1 | 1>
    }
  ]
  
  const results = await MLSListing.aggregate(pipeline)
  
  return results.map(({ _id: code, count }: { _id: string, count: number }) => ({
    code,
    count
  }))
}

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: { 
    timeFrame?: string
    priceRange?: string
    zipCode?: string
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    page?: string
    pageSize?: string
    search?: string
  }
}) {
  const timeFrame = searchParams.timeFrame || 'all'
  const priceRange = searchParams.priceRange || 'all'
  const zipCode = searchParams.zipCode || 'all'
  const searchQuery = searchParams.search || ''
  const sortField = searchParams.sortField || 'modificationTimestamp'
  const sortOrder = searchParams.sortOrder || 'desc'
  const page = Number(searchParams.page) || 1
  const pageSize = Number(searchParams.pageSize) || 24

  const [{ transactions, pagination, stats }, zipCodeData] = await Promise.all([
    getTransactions(
      timeFrame, 
      priceRange, 
      zipCode, 
      searchQuery,
      sortField, 
      sortOrder, 
      page, 
      pageSize
    ),
    getUniqueZipCodesWithCounts()
  ])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground mt-1">
          View and search all pending transactions. Filter by time frame, price range, or location. Search by property address or agent name.
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards 
        totalTransactions={stats.totalTransactions} 
        totalValue={stats.totalValue}
        uniqueAgents={stats.uniqueAgents}
        uniqueZipCodes={stats.uniqueZipCodes}
        lastSyncedAt={stats.lastSyncedAt}
      />

      {/* Main Content */}
      <div className="space-y-4">
        {/* Search and Filters Card */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <TransactionFiltersWrapper
              timeFrame={timeFrame}
              priceRange={priceRange}
              zipCode={zipCode}
              zipCodes={zipCodeData.map(zc => zc.code)}
              totalResults={pagination.total}
            />
          </div>
        </div>

        <Suspense fallback={<TableSkeleton />}>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, pagination.total)} of {pagination.total} transactions
            </div>
            <div className="flex items-center gap-4">
              <PageSizeSelector currentPageSize={pageSize} />
              <Pagination {...pagination} />
            </div>
          </div>

          {/* Table */}
          <TransactionsTable 
            transactions={transactions}
            sortField={sortField}
            sortOrder={sortOrder}
          />

          {/* Bottom Pagination (optional) */}
          <div className="mt-4 flex justify-end">
            <Pagination {...pagination} />
          </div>
        </Suspense>
      </div>
    </div>
  )
}

