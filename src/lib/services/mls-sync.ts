import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing } from '@/lib/models/mls'
import { getMLSToken, getNewPendingContracts } from '@/lib/mls-auth'
import { SyncHistory } from '@/lib/models/sync-history'

export async function syncMLSData(type: 'full' | 'quick' = 'full') {
  const startTime = new Date()
  let syncLog

  try {
    await connectDB()
    
    // Create sync log entry
    syncLog = await SyncHistory.create({
      startTime,
      type,
      status: 'in-progress'
    })

    // Get MLS token
    const token = await getMLSToken()
    
    if (type === 'full') {
      // Clear existing data
      await Promise.all([
        MLSAgent.deleteMany({}),
        MLSListing.deleteMany({})
      ])
    }

    // Fetch new data
    const { listings, agents } = await getNewPendingContracts(token)

    // Process agents
    const agentResults = await MLSAgent.bulkWrite(
      agents.map(agent => ({
        updateOne: {
          filter: { memberKey: agent.MemberKey },
          update: {
            $set: {
              memberKey: agent.MemberKey,
              fullName: agent.MemberFullName,
              firstName: agent.MemberFirstName,
              lastName: agent.MemberLastName,
              email: agent.MemberEmail,
              phone: agent.PreferredPhone,
              officeName: agent.OfficeName,
              modificationTimestamp: new Date(agent.ModificationTimestamp)
            }
          },
          upsert: true
        }
      }))
    )

    // Process listings
    const listingResults = await MLSListing.bulkWrite(
      listings.map(listing => ({
        updateOne: {
          filter: { listingKey: listing.ListingKey },
          update: {
            $set: {
              listingKey: listing.ListingKey,
              listPrice: listing.ListPrice,
              listAgentKey: listing.ListAgentKey,
              streetNumberNumeric: listing.StreetNumberNumeric,
              streetName: listing.StreetName,
              city: listing.City,
              stateOrProvince: listing.StateOrProvince,
              postalCode: listing.PostalCode,
              mlsStatus: listing.MlsStatus,
              modificationTimestamp: new Date(listing.ModificationTimestamp),
              contractStatusChangeDate: new Date(listing.ContractStatusChangeDate),
              listingContractDate: new Date(listing.ListingContractDate)
            }
          },
          upsert: true
        }
      }))
    )

    // Update sync log
    await SyncHistory.findByIdAndUpdate(syncLog._id, {
      endTime: new Date(),
      status: 'success',
      agentsProcessed: agents.length,
      listingsProcessed: listings.length,
      agentsUpserted: agentResults.upsertedCount,
      listingsUpserted: listingResults.upsertedCount
    })

    return {
      success: true,
      agents: {
        processed: agents.length,
        upserted: agentResults.upsertedCount
      },
      listings: {
        processed: listings.length,
        upserted: listingResults.upsertedCount
      }
    }

  } catch (error) {
    // Log sync failure
    if (syncLog) {
      await SyncHistory.findByIdAndUpdate(syncLog._id, {
        endTime: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    throw error
  }
} 