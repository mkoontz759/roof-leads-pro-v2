import { PrismaClient } from '@prisma/client'
import { getMLSToken } from '../mls-auth'
import { PROPERTY_FIELDS, AGENT_FIELDS } from '../constants/mls-fields'
import type { MLSTransaction, MLSAgent } from '../types/mls'

const prisma = new PrismaClient()

// Import MLS API URL from mls-auth.ts
const MLS_API_URL = 'https://retsapi.raprets.com/2/lab_lbk/RESO/OData'

export async function syncMLSData() {
  const syncLog = await createSyncLog('Full')
  let recordsProcessed = 0

  try {
    const token = await getMLSToken()
    
    // Get total counts first
    const counts = await Promise.all([
      getStatusCount(token, 'Active'),
      getStatusCount(token, 'Under Contract'),
      getStatusCount(token, 'Closed')
    ])

    const totalRecords = counts.reduce((a, b) => a + b, 0)
    console.log(`Total records to process: ${totalRecords}`)

    // Process each status
    for (const status of ['Active', 'Under Contract', 'Closed']) {
      await processStatus(token, status, (processed) => {
        recordsProcessed += processed
        // Update progress in sync log
        return updateSyncLog(syncLog.id, {
          recordsProcessed,
          status: 'In Progress'
        })
      })
    }

    await updateSyncLog(syncLog.id, {
      status: 'Success',
      recordsProcessed
    })

  } catch (error) {
    await updateSyncLog(syncLog.id, {
      status: 'Failed',
      error: error.message
    })
    throw error
  }
}

export async function getNewPendingContracts(token: string) {
  try {
    // First, let's get active listings
    console.log('Fetching active listings...')
    const activeParams = new URLSearchParams({
      '$filter': "StandardStatus eq 'Active'",
      '$select': 'ListingKey,ListPrice,ListAgentKey,StandardStatus,ModificationTimestamp,ListDate,StreetNumberNumeric,StreetName,City,StateOrProvince,PostalCode',
      '$orderby': 'ModificationTimestamp desc',
      '$count': 'true',
      'class': 'Residential'
    }).toString()

    const activeResponse = await fetch(`${MLS_API_URL}/Property?${activeParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Prefer': 'odata.maxpagesize=100'
      }
    })

    if (!activeResponse.ok) {
      const errorText = await activeResponse.text()
      console.error('Error response:', errorText)
      throw new Error(`Failed to fetch active listings: ${activeResponse.status} ${activeResponse.statusText}`)
    }

    const activeData = await activeResponse.json()
    console.log(`Found ${activeData['@odata.count']} active listings`)

    // Process active listings
    await processListings(activeData.value, 'Active')

    // Then get pending listings
    console.log('Fetching pending listings...')
    const pendingParams = new URLSearchParams({
      '$filter': "StandardStatus eq 'Under Contract'",
      '$select': 'ListingKey,ListPrice,ListAgentKey,StandardStatus,ModificationTimestamp,ListDate,StreetNumberNumeric,StreetName,City,StateOrProvince,PostalCode',
      '$orderby': 'ModificationTimestamp desc',
      '$count': 'true',
      'class': 'Residential'
    }).toString()

    // ... similar code for pending and sold listings ...

    return {
      activeCount: activeData['@odata.count'],
      pendingCount: pendingData['@odata.count'],
      soldCount: soldData['@odata.count']
    }
  } catch (error) {
    console.error('Error in getNewPendingContracts:', error)
    throw error
  }
}

// Helper function to process and store listings
async function processListings(listings: any[], status: string) {
  for (const listing of listings) {
    await prisma.transaction.upsert({
      where: { ListingKey: listing.ListingKey },
      update: {
        ...listing,
        ModificationTimestamp: new Date(listing.ModificationTimestamp),
        ListDate: new Date(listing.ListDate),
        StandardStatus: status
      },
      create: {
        ...listing,
        ModificationTimestamp: new Date(listing.ModificationTimestamp),
        ListDate: new Date(listing.ListDate),
        StandardStatus: status
      }
    })
  }

  // Handle pagination using @odata.nextLink if present
  if (listings['@odata.nextLink']) {
    const nextResponse = await fetch(listings['@odata.nextLink'], {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Prefer': 'odata.maxpagesize=100'
      }
    })
    const nextData = await nextResponse.json()
    await processListings(nextData.value, status)
  }
}

async function createSyncLog(type: 'Full' | 'Incremental') {
  return prisma.syncLog.create({
    data: {
      type,
      status: 'In Progress',
      startTime: new Date()
    }
  })
}

async function updateSyncLog(id: string, data: { 
  status: 'Success' | 'Failed',
  recordsProcessed?: number,
  error?: string,
  endTime?: Date 
}) {
  return prisma.syncLog.update({
    where: { id },
    data: {
      ...data,
      endTime: data.endTime || new Date()
    }
  })
}

async function getLastSuccessfulSync() {
  return prisma.syncLog.findFirst({
    where: {
      status: 'Success'
    },
    orderBy: {
      endTime: 'desc'
    }
  })
}

export async function syncMLSDataIncremental(token: string) {
  const syncLog = await createSyncLog('Incremental')
  let recordsProcessed = 0
  
  try {
    const lastSync = await getLastSuccessfulSync()
    const lastSyncTime = lastSync?.endTime || new Date(0) // If no previous sync, get all records

    // Format date for OData
    const formattedDate = lastSyncTime.toISOString()
    
    // Get all listings modified since last sync
    const params = new URLSearchParams({
      '$filter': `ModificationTimestamp gt ${formattedDate}`,
      '$select': 'ListingKey,ListPrice,ListAgentKey,StandardStatus,ModificationTimestamp,ListDate,StreetNumberNumeric,StreetName,City,StateOrProvince,PostalCode',
      '$orderby': 'ModificationTimestamp desc',
      '$count': 'true',
      'class': 'Residential'
    }).toString()

    const response = await fetch(`${MLS_API_URL}/Property?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Prefer': 'odata.maxpagesize=100'
      }
    })

    // ... process response and update database ...
    recordsProcessed = /* number of records processed */

    await updateSyncLog(syncLog.id, {
      status: 'Success',
      recordsProcessed
    })

  } catch (error) {
    await updateSyncLog(syncLog.id, {
      status: 'Failed',
      error: error.message
    })
    throw error
  }
} 