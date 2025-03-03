import { prisma } from '../lib/db'
import type { MLSTransaction, MLSAgent } from '../lib/types/mls'

async function getMLSToken() {
  const response = await fetch('https://retsidentityapi.raprets.com/lab_lbk/oauth/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      response_type: 'code',
      client_id: 'lab_lbk',
      redirect_uri: 'http://localhost:3000/api/auth/mls/callback'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get MLS token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

async function fetchAllListings(token: string) {
  console.log('Fetching all listings...')
  const response = await fetch('http://localhost:3000/api/mls/listings', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch listings: ${response.statusText}`)
  }

  const data = await response.json()
  return data.listings
}

async function fetchAllAgents(token: string) {
  console.log('Fetching all agents...')
  const response = await fetch('http://localhost:3000/api/mls/agents', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.statusText}`)
  }

  const data = await response.json()
  return data.agents
}

async function importAgents(agents: MLSAgent[]) {
  console.log(`Importing ${agents.length} agents...`)
  let created = 0
  let updated = 0

  for (const agent of agents) {
    const result = await prisma.agent.upsert({
      where: { MemberKey: agent.MemberKey },
      update: {
        MemberFirstName: agent.MemberFirstName,
        MemberLastName: agent.MemberLastName,
        MemberEmail: agent.MemberEmail,
        PreferredPhone: agent.PreferredPhone,
        OfficeName: agent.OfficeName,
      },
      create: {
        MemberKey: agent.MemberKey,
        MemberFirstName: agent.MemberFirstName,
        MemberLastName: agent.MemberLastName,
        MemberEmail: agent.MemberEmail,
        PreferredPhone: agent.PreferredPhone,
        OfficeName: agent.OfficeName,
      },
    })

    if (result.id) {
      result.createdAt === result.updatedAt ? created++ : updated++
    }

    // Log progress every 100 agents
    if ((created + updated) % 100 === 0) {
      console.log(`Processed ${created + updated} agents...`)
    }
  }

  return { created, updated }
}

async function importListings(listings: MLSTransaction[]) {
  console.log(`Importing ${listings.length} listings...`)
  let created = 0
  let updated = 0

  for (const listing of listings) {
    try {
      const result = await prisma.transaction.upsert({
        where: { ListingKey: listing.ListingKey },
        update: {
          ListPrice: listing.ListPrice,
          StandardStatus: listing.StandardStatus,
          ModificationTimestamp: new Date(listing.ModificationTimestamp),
          Bathrooms: listing.Bathrooms,
          Bedrooms: listing.Bedrooms,
          LivingArea: listing.LivingArea,
          YearBuilt: listing.YearBuilt,
          PropertyType: listing.PropertyType,
          PropertySubType: listing.PropertySubType,
          PendingTimestamp: listing.PendingTimestamp ? new Date(listing.PendingTimestamp) : null,
          CloseDate: listing.CloseDate ? new Date(listing.CloseDate) : null,
          TaxAnnualAmount: listing.TaxAnnualAmount,
        },
        create: {
          ListingKey: listing.ListingKey,
          ListPrice: listing.ListPrice,
          ListAgentKey: listing.ListAgentKey,
          StandardStatus: listing.StandardStatus,
          ModificationTimestamp: new Date(listing.ModificationTimestamp),
          ListDate: new Date(listing.ListDate),
          StreetNumberNumeric: listing.StreetNumberNumeric,
          StreetName: listing.StreetName,
          City: listing.City,
          StateOrProvince: listing.StateOrProvince,
          PostalCode: listing.PostalCode,
          Bathrooms: listing.Bathrooms,
          Bedrooms: listing.Bedrooms,
          LivingArea: listing.LivingArea,
          YearBuilt: listing.YearBuilt,
          PropertyType: listing.PropertyType,
          PropertySubType: listing.PropertySubType,
          PendingTimestamp: listing.PendingTimestamp ? new Date(listing.PendingTimestamp) : null,
          CloseDate: listing.CloseDate ? new Date(listing.CloseDate) : null,
          TaxAnnualAmount: listing.TaxAnnualAmount,
        }
      })

      if (result.id) {
        result.createdAt === result.updatedAt ? created++ : updated++
      }

      // Log progress every 100 listings
      if ((created + updated) % 100 === 0) {
        console.log(`Processed ${created + updated} listings...`)
      }
    } catch (error) {
      console.error(`Failed to import listing ${listing.ListingKey}:`, error)
    }
  }

  return { created, updated }
}

async function main() {
  try {
    console.log('Starting MLS data import...')
    const startTime = Date.now()

    // Get MLS token
    const token = await getMLSToken()
    console.log('Got MLS token')

    // Fetch all data
    const [listings, agents] = await Promise.all([
      fetchAllListings(token),
      fetchAllAgents(token)
    ])

    // Import agents first (because listings reference agents)
    const agentStats = await importAgents(agents)
    console.log('Agent import complete:', agentStats)

    // Then import listings
    const listingStats = await importListings(listings)
    console.log('Listing import complete:', listingStats)

    const duration = (Date.now() - startTime) / 1000
    console.log(`Import completed in ${duration.toFixed(2)} seconds`)
    console.log('Final stats:', {
      agents: agentStats,
      listings: listingStats
    })

  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

// Run the import
main() 