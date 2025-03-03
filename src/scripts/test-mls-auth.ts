import { getMLSToken, testMLSAccess } from '../lib/mls-auth'

async function testAuth() {
  try {
    console.log('Testing MLS Authentication...')
    console.log('Getting token using Password Grant...')
    
    const token = await getMLSToken()
    console.log('Token received:', token.substring(0, 20) + '...')

    console.log('\nTesting API access...')
    const data = await testMLSAccess(token)
    console.log('API Response:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

testAuth() 