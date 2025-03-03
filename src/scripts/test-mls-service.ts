import { MLSService } from '../lib/services/mls'

async function testMLSService() {
  try {
    console.log('1. Creating MLS Service...')
    const mlsService = new MLSService()

    console.log('\n2. Testing authentication...')
    const token = await mlsService.authenticate()
    console.log('Token received:', token?.substring(0, 20) + '...')

    console.log('\n3. Testing getNewPendingContracts...')
    const { listings, agents } = await mlsService.getNewPendingContracts()
    
    console.log('\nSample Listing:', listings[0])
    console.log(`Total Listings: ${listings.length}`)
    
    console.log('\nSample Agent:', agents[0])
    console.log(`Total Agents: ${agents.length}`)

  } catch (error) {
    console.error('\nTest failed:', error)
    process.exit(1)
  }
}

// Run the test
testMLSService() 