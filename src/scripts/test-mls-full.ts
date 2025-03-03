import { getMLSToken, getMetadata, getNewPendingContracts } from '../lib/mls-auth'

async function testMLSFunctions() {
  try {
    // Step 1: Get Token
    console.log('\n1. Getting MLS Token...')
    const token = await getMLSToken()
    console.log('Token received:', token.substring(0, 20) + '...')

    // Step 2: Get Metadata
    console.log('\n2. Getting Metadata...')
    const metadata = await getMetadata(token)
    console.log('Available endpoints:', metadata)

    // Step 3: Get Pending Contracts and Agents
    console.log('\n3. Getting Pending Contracts and Agents...')
    const { listings, agents } = await getNewPendingContracts(token)
    
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
testMLSFunctions() 