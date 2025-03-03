import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { connectDB, mongoose } from '@/lib/mongodb'
import { MLSAgent, MLSListing, MLSSource } from '@/lib/models/mls'
import { syncSparkData } from '@/lib/services/spark-sync'

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from: ${envLocalPath}`)
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found, falling back to .env')
  dotenv.config()
}

// Verify MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set')
  process.exit(1)
}

async function migrateMlsData() {
  try {
    console.log('Starting MLS data migration...')
    
    // Connect to database
    await connectDB()
    console.log('Connected to MongoDB')

    // Get initial counts by source
    const initialRapattoniListings = await MLSListing.countDocuments({ source: MLSSource.RAPATTONI })
    const initialRapattoniAgents = await MLSAgent.countDocuments({ source: MLSSource.RAPATTONI })
    const initialSparkListings = await MLSListing.countDocuments({ source: MLSSource.SPARK })
    const initialSparkAgents = await MLSAgent.countDocuments({ source: MLSSource.SPARK })
    
    console.log('Initial counts:')
    console.log(`- Rapattoni: ${initialRapattoniListings} listings, ${initialRapattoniAgents} agents`)
    console.log(`- Spark: ${initialSparkListings} listings, ${initialSparkAgents} agents`)
    
    // Option 1: Delete all Rapattoni data
    console.log('\nDeleting all Rapattoni data...')
    const deleteListingsResult = await MLSListing.deleteMany({ source: MLSSource.RAPATTONI })
    const deleteAgentsResult = await MLSAgent.deleteMany({ source: MLSSource.RAPATTONI })
    
    console.log(`- Deleted ${deleteListingsResult.deletedCount} Rapattoni listings`)
    console.log(`- Deleted ${deleteAgentsResult.deletedCount} Rapattoni agents`)
    
    // Run Spark sync to ensure we have the latest data
    console.log('\nRunning full Spark sync...')
    const syncResult = await syncSparkData('full')
    console.log('Sync completed:', syncResult)
    
    // Get final counts
    const finalRapattoniListings = await MLSListing.countDocuments({ source: MLSSource.RAPATTONI })
    const finalRapattoniAgents = await MLSAgent.countDocuments({ source: MLSSource.RAPATTONI })
    const finalSparkListings = await MLSListing.countDocuments({ source: MLSSource.SPARK })
    const finalSparkAgents = await MLSAgent.countDocuments({ source: MLSSource.SPARK })
    
    console.log('\nFinal counts:')
    console.log(`- Rapattoni: ${finalRapattoniListings} listings, ${finalRapattoniAgents} agents`)
    console.log(`- Spark: ${finalSparkListings} listings, ${finalSparkAgents} agents`)
    
    // Sample data verification
    console.log('\nVerifying Spark data...')
    const sampleListing: any = await MLSListing.findOne({ source: MLSSource.SPARK }).lean()
    if (sampleListing) {
      console.log('\nSample Spark listing:')
      console.log(`- ID: ${sampleListing._id}`)
      console.log(`- Listing Key: ${sampleListing.listingKey}`)
      console.log(`- Source: ${sampleListing.source}`)
      console.log(`- City: ${sampleListing.city}`)
      console.log(`- Price: ${sampleListing.listPrice}`)
    }

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    // Disconnect from database
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the migration
migrateMlsData() 