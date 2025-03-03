import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing } from '@/lib/models/mls'
import { SparkAPI } from '@/lib/services/spark-api'

const API_KEY = process.env.API_KEY || 'localdev'

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
    
    // Get list of valid agent keys already in the database
    const validAgentKeys = await MLSAgent.distinct('memberKey')
    
    // Find listings with agent keys that don't match any agent in the database
    const invalidAgentListings = await MLSListing.find({
      listAgentKey: { $nin: validAgentKeys, $ne: null }
    }).distinct('listAgentKey')
    
    console.log(`Found ${invalidAgentListings.length} unique agent keys that need to be synced`)
    
    // Perform analysis on the invalid agent keys
    const keyAnalysis = {
      validFormat: 0,
      invalidFormat: 0,
      formatTypes: {} as Record<string, number>
    }
    
    // Check agent key formats
    for (const key of invalidAgentListings) {
      // Valid agent keys are typically numeric or alphanumeric without special prefixes like "listing-"
      if (/^listing-/.test(key)) {
        keyAnalysis.invalidFormat++
        keyAnalysis.formatTypes['listing-prefix'] = (keyAnalysis.formatTypes['listing-prefix'] || 0) + 1
      } else if (/^\d+$/.test(key)) {
        // Numeric keys are likely valid
        keyAnalysis.validFormat++
        keyAnalysis.formatTypes['numeric'] = (keyAnalysis.formatTypes['numeric'] || 0) + 1
      } else {
        // Check for other patterns
        const pattern = key.match(/^[a-zA-Z]+-/) ? 'prefix-format' : 'other'
        keyAnalysis.invalidFormat++
        keyAnalysis.formatTypes[pattern] = (keyAnalysis.formatTypes[pattern] || 0) + 1
      }
    }
    
    if (invalidAgentListings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No missing agents found',
        agentCount: 0
      })
    }
    
    // Get sample of the first 10 keys for inspection
    const keysSample = invalidAgentListings.slice(0, 10)
    
    // Initialize SparkAPI
    const sparkApi = new SparkAPI()
    try {
      await sparkApi.authenticate()
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Spark API authentication failed',
        message: error.message
      }, { status: 500 })
    }
    
    // Track results
    const results = {
      totalAgentsFound: 0,
      totalAgentsSynced: 0,
      missingAgents: 0,
      errors: [] as string[]
    }
    
    // Only try to sync numeric keys which are more likely to be valid agent keys
    const likelyValidKeys = invalidAgentListings.filter(key => /^\d+$/.test(key))
    
    console.log(`Found ${likelyValidKeys.length} keys with potentially valid format`)
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10
    const batches = Math.ceil(likelyValidKeys.length / batchSize)
    
    // Limit to first 3 batches for initial testing
    const maxBatches = Math.min(batches, 3)
    
    for (let i = 0; i < maxBatches; i++) {
      const batchStart = i * batchSize
      const batchEnd = Math.min(batchStart + batchSize, likelyValidKeys.length)
      const batch = likelyValidKeys.slice(batchStart, batchEnd)
      
      console.log(`Processing batch ${i + 1}/${maxBatches} (${batch.length} agents)`)
      
      // Process each agent key in the batch
      const batchPromises = batch.map(async (agentKey) => {
        try {
          // Fetch agent details from Spark API by Member Key
          const sparkAgent = await sparkApi.getMemberByKey(agentKey)
          
          if (!sparkAgent) {
            console.warn(`Agent not found in Spark API: ${agentKey}`)
            results.missingAgents++
            return null
          }
          
          results.totalAgentsFound++
          
          // Create or update the agent in the database
          const agent = {
            memberKey: sparkAgent.MemberKey,
            memberKeyNumeric: parseInt(sparkAgent.MemberKey),
            memberMlsId: sparkAgent.MemberMlsId,
            fullName: sparkAgent.MemberFullName || `${sparkAgent.MemberFirstName} ${sparkAgent.MemberLastName}`.trim(),
            firstName: sparkAgent.MemberFirstName,
            lastName: sparkAgent.MemberLastName,
            email: sparkAgent.MemberEmail,
            phone: sparkAgent.MemberPreferredPhone,
            officeName: sparkAgent.OfficeName,
            modificationTimestamp: new Date(sparkAgent.ModificationTimestamp),
            source: 'spark',
            sourceId: sparkAgent.MemberKey,
            association: 'aar', // Assuming Amarillo Association of Realtors
            pendingListings: []
          }
          
          // Upsert the agent
          await MLSAgent.findOneAndUpdate(
            { memberKey: agent.memberKey },
            agent,
            { upsert: true, new: true }
          )
          
          results.totalAgentsSynced++
          return agent
        } catch (error: any) {
          console.error(`Error processing agent ${agentKey}:`, error)
          results.errors.push(`Error with agent ${agentKey}: ${error.message}`)
          return null
        }
      })
      
      // Wait for all promises in the batch to resolve
      await Promise.all(batchPromises)
      
      // Add a small delay between batches to avoid rate limiting
      if (i < maxBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Return results with analysis
    return NextResponse.json({
      success: true,
      ...results,
      keyAnalysis,
      totalInvalidAgentKeys: invalidAgentListings.length,
      sampleKeys: keysSample,
      note: "Many listings have invalid agent keys. Consider updating these listings with correct agent references."
    })
    
  } catch (error: any) {
    console.error('Error syncing missing agents:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred while syncing missing agents'
    }, { status: 500 })
  }
} 