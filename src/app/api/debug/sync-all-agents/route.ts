import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing, MLSSource, MLSAssociation } from '@/lib/models/mls'
import axios from 'axios'

const API_KEY = process.env.API_KEY || 'localdev'
const SPARK_API_URL = process.env.SPARK_API_URL || 'https://replication.sparkapi.com'
const SPARK_API_TOKEN = process.env.SPARK_API_TOKEN || '3tk5g91q5f96npri34ilsb6a5'

export async function GET(request: Request) {
  // Authenticate the request
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  
  if (key !== API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'Invalid API key'
    }, { status: 401 })
  }
  
  try {
    await connectDB()
    
    console.log('Starting agent sync process...')
    const startTime = Date.now()
    
    // Get all unique valid agent keys from listings
    // Only get numeric keys, which are more likely to be actual agent IDs
    const validAgentKeyPattern = /^\d+$/
    const allAgentKeys = await MLSListing.distinct('listAgentKey')
    const validAgentKeys = allAgentKeys.filter(key => 
      key && validAgentKeyPattern.test(key)
    )
    
    console.log(`Found ${validAgentKeys.length} potentially valid agent keys out of ${allAgentKeys.length} total`)
    
    // Create Spark API client
    const sparkApi = axios.create({
      baseURL: SPARK_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-SparkApi-User-Agent': 'RoofLeadsPro/1.0',
        'Authorization': `Bearer ${SPARK_API_TOKEN}`
      }
    })
    
    // Check API connectivity
    try {
      const systemResponse = await sparkApi.get('/v1/system')
      console.log('API connection successful:', systemResponse.data?.D?.Results[0]?.Name || 'Connected')
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Spark API',
        message: error.message
      }, { status: 500 })
    }
    
    // Track results
    const results = {
      totalProcessed: 0,
      totalFound: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    // Process in batches
    const batchSize = 10
    const batches = Math.ceil(validAgentKeys.length / batchSize)
    
    // Optionally limit batches for testing
    const maxBatches = parseInt(searchParams.get('maxBatches') || String(batches), 10)
    const actualBatches = Math.min(batches, maxBatches)
    
    console.log(`Processing ${actualBatches} batches of ${batchSize} agents each`)
    
    for (let i = 0; i < actualBatches; i++) {
      const batchStart = i * batchSize
      const batchEnd = Math.min(batchStart + batchSize, validAgentKeys.length)
      const batch = validAgentKeys.slice(batchStart, batchEnd)
      
      console.log(`Processing batch ${i + 1}/${actualBatches} (${batch.length} agents)`)
      
      // Process agents in parallel within each batch
      const batchPromises = batch.map(async (agentKey) => {
        try {
          results.totalProcessed++
          
          // Fetch agent from Spark API
          const response = await sparkApi.get(`/v1/members/${agentKey}`)
          
          if (!response.data?.D?.Results?.[0]) {
            throw new Error(`No data returned for agent ${agentKey}`)
          }
          
          const agent = response.data.D.Results[0]
          results.totalFound++
          
          // Format agent data to match our schema
          const agentData = {
            memberKey: agent.MemberKey,
            memberKeyNumeric: parseInt(agent.MemberKey),
            memberMlsId: agent.MemberMlsId || '',
            fullName: agent.MemberFullName || `${agent.MemberFirstName} ${agent.MemberLastName}`.trim(),
            firstName: agent.MemberFirstName,
            lastName: agent.MemberLastName,
            email: agent.MemberEmail,
            phone: agent.MemberPreferredPhone,
            officeName: agent.OfficeName,
            modificationTimestamp: new Date(agent.ModificationTimestamp),
            source: MLSSource.SPARK,
            sourceId: agent.MemberKey,
            association: MLSAssociation.AAR,
            pendingListings: [],
            updatedAt: new Date()
          }
          
          // Find agent with this member key
          const existingAgent = await MLSAgent.findOne({ memberKey: agentKey })
          
          if (existingAgent) {
            // Update existing agent
            await MLSAgent.updateOne(
              { memberKey: agentKey },
              { $set: agentData }
            )
            results.updated++
          } else {
            // Create new agent
            await MLSAgent.create(agentData)
            results.created++
          }
          
          return agentData
        } catch (error: any) {
          results.failed++
          const errorMessage = `Error processing agent ${agentKey}: ${error.message}`
          console.error(errorMessage)
          results.errors.push(errorMessage)
          return null
        }
      })
      
      // Wait for all promises in the batch to resolve
      await Promise.all(batchPromises)
      
      // Add a small delay between batches to avoid rate limiting
      if (i < actualBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    const duration = (Date.now() - startTime) / 1000
    console.log(`Agent sync completed in ${duration.toFixed(2)} seconds`)
    
    // Return results
    return NextResponse.json({
      success: true,
      ...results,
      validAgentKeysCount: validAgentKeys.length,
      totalAgentKeysCount: allAgentKeys.length,
      duration: `${duration.toFixed(2)} seconds`,
      errorSamples: results.errors.slice(0, 10) // Return just the first 10 errors
    })
    
  } catch (error: any) {
    console.error('Error syncing agents:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred while syncing agents'
    }, { status: 500 })
  }
} 