import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
console.log(`Checking for env at: ${envLocalPath}`)
console.log(`File exists: ${fs.existsSync(envLocalPath)}`)

if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from: ${envLocalPath}`)
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found, falling back to .env')
  dotenv.config()
}

// Check environment variables
console.log('Environment variables:')
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? `${process.env.MONGODB_URI.slice(0, 20)}...` : 'not set')
console.log('- SPARK_API_TOKEN:', process.env.SPARK_API_TOKEN ? `${process.env.SPARK_API_TOKEN.slice(0, 5)}...` : 'not set')
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set') 