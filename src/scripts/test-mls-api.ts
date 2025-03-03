import { getMLSToken, getMetadata, getNewPendingContracts, getAvailableFields } from '../lib/mls-auth'
import { filterActiveListings, filterUnderContractListings, getRecentStatusChanges } from '../lib/services/mls'

async function testMLSAPI() {
  try {
    // 1. Test Authentication
    console.log('Getting auth token...')
    const token = await getMLSToken()
    console.log('✓ Got token:', token.substring(0, 20) + '...')

    // 2. Test Data Fetching
    console.log('\nGetting all residential listings and agents...')
    const { listings, agents } = await getNewPendingContracts(token)
    
    // 3. Test Business Logic
    const activeListings = filterActiveListings(listings)
    const underContractListings = filterUnderContractListings(listings)
    const recentChanges = getRecentStatusChanges(listings)
    
    console.log('\nSummary:')
    console.log(`Total Listings: ${listings.length}`)
    console.log(`Active Listings: ${activeListings.length}`)
    console.log(`Under Contract: ${underContractListings.length}`)
    console.log(`Recent Changes: ${recentChanges.length}`)

    // 4. Sample Data
    if (listings.length > 0) {
      console.log('\nSample Listing:', {
        listingKey: listings[0].ListingKey,
        price: listings[0].ListPrice,
        city: listings[0].City,
        status: listings[0].MlsStatus,
        contractDate: listings[0].ContractStatusChangeDate,
        listedDate: listings[0].ListingContractDate
      })
    }

    if (agents.length > 0) {
      console.log('\nSample Agent:', {
        name: agents[0].MemberFullName,
        email: agents[0].MemberEmail,
        office: agents[0].OfficeName,
        phone: agents[0].PreferredPhone
      })
    }

    console.log(`✓ Got ${agents.length} agents`)

  } catch (error: any) {
    console.error('\nTest failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    process.exit(1)
  }
}

testMLSAPI() 