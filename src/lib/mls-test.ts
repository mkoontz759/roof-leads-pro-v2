import { getMLSToken } from './mls-auth'

export async function testMLSData() {
  try {
    // 1. Get auth token
    const token = await getMLSToken()
    
    // 2. Test endpoints to see available data
    const endpoints = [
      // Get metadata to see available fields
      'http://retsapi.raprets.com/2/lab_lbk/RESO/odata/$metadata',
      
      // Get a sample of recent transactions
      'http://retsapi.raprets.com/2/lab_lbk/RESO/odata/Property?$top=5&$filter=StandardStatus eq \'Pending\'',
      
      // Get available lookup values
      'http://retsapi.raprets.com/2/lab_lbk/RESO/odata/Lookup'
    ]

    for (const url of endpoints) {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      console.log('\nEndpoint:', url)
      console.log('Sample Data:', JSON.stringify(data, null, 2))
    }

  } catch (error) {
    console.error('Test Error:', error)
  }
} 