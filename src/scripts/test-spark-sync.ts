import { config } from 'dotenv'
import { connectDB } from '@/lib/mongodb'
import { syncSparkData } from '@/lib/services/spark-sync'
import { MLSAgent, MLSListing } from '@/lib/models/mls'

// Load environment variables
config({ path: '.env.local' })

async function testSparkSync() {
  try {
    console.log('Starting Spark sync test...')
    
    // Connect to database
    await connectDB()
    console.log('Connected to MongoDB')

    // Get initial counts
    const initialAgents = await MLSAgent.countDocuments()
    const initialListings = await MLSListing.countDocuments()
    console.log('Initial counts:', {
      agents: initialAgents,
      listings: initialListings
    })

    // Run sync
    console.log('\nStarting sync...')
    const result = await syncSparkData('full')
    console.log('Sync completed:', result)

    // Get final counts
    const finalAgents = await MLSAgent.countDocuments()
    const finalListings = await MLSListing.countDocuments()
    console.log('\nFinal counts:', {
      agents: finalAgents,
      listings: finalListings
    })

    // Sample data verification
    console.log('\nVerifying data...')
    
    const sampleListing = await MLSListing.findOne().lean()
    console.log('\nSample listing:', JSON.stringify(sampleListing, null, 2))

    const sampleAgent = await MLSAgent.findOne().lean()
    console.log('\nSample agent:', JSON.stringify(sampleAgent, null, 2))

  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

testSparkSync() 