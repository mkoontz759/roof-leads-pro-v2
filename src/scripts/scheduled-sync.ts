/**
 * Scheduled MLS Sync Script
 * 
 * This script can be executed by a cron job to perform automated incremental syncs.
 * 
 * Example cron setup (runs every hour on the hour):
 * 0 * * * * cd /path/to/project && npm run sync:scheduled
 * 
 * Add this to package.json:
 * "scripts": {
 *   "sync:scheduled": "ts-node --project tsconfig.server.json -r tsconfig-paths/register src/scripts/scheduled-sync.ts"
 * }
 */

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import fetch from 'node-fetch'

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from: ${envLocalPath}`)
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found, falling back to .env')
  dotenv.config()
}

// Required environment variables
const requiredEnvVars = [
  'CRON_SECRET',
  'APP_URL'
]

// Check if required environment variables are present
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
  process.exit(1)
}

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET as string
const DEFAULT_SYNC_TYPE = 'incremental'

// Define sync type
type SyncType = 'full' | 'incremental'

interface SyncOptions {
  type?: SyncType
  timeout?: number  // in milliseconds
}

/**
 * Run a scheduled sync by calling the API endpoint
 */
async function runScheduledSync({ 
  type = DEFAULT_SYNC_TYPE, 
  timeout = 120000  // 2 minute timeout default
}: SyncOptions = {}) {
  try {
    console.log(`Starting ${type} sync via API...`)

    // Construct the URL for the sync endpoint
    const url = `${APP_URL}/api/mls/sync/${type === 'full' ? 'full' : 'cron'}`
    
    // Set up AbortController with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Make the API request with authorization
    const response = await fetch(url, {
      method: type === 'full' ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })

    // Clear the timeout
    clearTimeout(timeoutId)
    
    // Parse the response
    const data = await response.json()
    
    // Check for errors
    if (!response.ok) {
      console.error(`Sync failed with status ${response.status}:`, data.error || 'Unknown error')
      process.exit(1)
    }
    
    // Log success
    console.log(`Sync completed successfully:`, data)
    process.exit(0)
  } catch (error) {
    // Handle errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Sync timed out after ${timeout/1000} seconds`)
    } else {
      console.error('Sync failed with error:', error)
    }
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const syncType: SyncType = args[0] === 'full' ? 'full' : 'incremental'

// Run the sync
runScheduledSync({ type: syncType }) 