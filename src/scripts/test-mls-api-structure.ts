import { getMLSToken } from '../lib/mls-auth'

async function testMLSAPI() {
  try {
    // Step 1: Get Token
    console.log('\n1. Getting MLS Token...')
    const token = await getMLSToken()
    console.log('Token received:', token.substring(0, 20) + '...')

    // Step 2: Get a single property to see structure
    console.log('\n2. Testing simple property query...')
    const response = await fetch('https://retsapi.raprets.com/2/lab_lbk/RESO/OData/Property?$top=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`API test failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('\nSample Property Data Structure:')
    console.log(JSON.stringify(data.value[0], null, 2))

    // Step 3: Test different status filters
    console.log('\n3. Testing status filters...')
    for (const status of ['Active', 'Under Contract', 'Closed']) {
      const statusResponse = await fetch(
        `https://retsapi.raprets.com/2/lab_lbk/RESO/OData/Property?$filter=StandardStatus eq '${status}'&$top=1&$count=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      const statusData = await statusResponse.json()
      console.log(`\n${status} listings count:`, statusData['@odata.count'])
      if (statusData.value.length > 0) {
        console.log('Sample', status, 'listing:', {
          ListingKey: statusData.value[0].ListingKey,
          StandardStatus: statusData.value[0].StandardStatus,
          ListPrice: statusData.value[0].ListPrice,
          ModificationTimestamp: statusData.value[0].ModificationTimestamp
        })
      }
    }

  } catch (error) {
    console.error('\nTest failed:', error)
    process.exit(1)
  }
}

// Run the test
testMLSAPI() 