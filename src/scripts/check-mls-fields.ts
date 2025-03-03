import { config } from 'dotenv'
import { getMLSToken, getNewPendingContracts } from '@/lib/mls-auth'

// Load environment variables from .env and .env.local
config({ path: '.env' })
config({ path: '.env.local' })

async function checkAgentFields() {
  try {
    // Verify env vars are loaded
    console.log('Checking environment variables...')
    const requiredVars = ['MLS_CLIENT_ID', 'MLS_CLIENT_SECRET', 'MLS_USERNAME', 'MLS_PASSWORD']
    const missing = requiredVars.filter(v => !process.env[v])
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }

    console.log('Getting MLS token...')
    const token = await getMLSToken()
    
    console.log('Fetching sample agent data...')
    const { agents } = await getNewPendingContracts(token)
    
    if (agents.length > 0) {
      const sampleAgent = agents[0]
      console.log('\nSample Agent Data:')
      console.log(JSON.stringify(sampleAgent, null, 2))
      
      // Log all fields that look like IDs
      console.log('\nPotential ID fields found:')
      Object.entries(sampleAgent).forEach(([key, value]) => {
        if (key.toLowerCase().includes('id') || key.toLowerCase().includes('key')) {
          console.log(`${key}: ${value} (${typeof value})`)
        }
      })
      
      console.log('\nTotal agents:', agents.length)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

checkAgentFields() 