import { getMLSToken, getNewPendingContracts } from '../lib/mls-auth'

async function testImport() {
  try {
    console.log('1. Getting MLS token...')
    const token = await getMLSToken()
    console.log('Token received:', token.substring(0, 20) + '...')

    console.log('\n2. Fetching data...')
    const { listings, agents } = await getNewPendingContracts(token)

    console.log('\nSample Agent:', agents[0])
    console.log(`Total Agents: ${agents.length}`)

    console.log('\nSample Listing:', listings[0])
    console.log(`Total Listings: ${listings.length}`)

  } catch (error) {
    console.error('Test failed:', error)
  }
}

testImport() 