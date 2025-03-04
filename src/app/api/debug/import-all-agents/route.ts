import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSSource, MLSAssociation } from '@/lib/models/mls'
import axios from 'axios'

const API_KEY = process.env.API_KEY || 'localdev'
const SPARK_API_URL = process.env.SPARK_API_URL || 'https://replication.sparkapi.com'
const SPARK_API_TOKEN = process.env.SPARK_API_TOKEN

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
  
  if (!SPARK_API_TOKEN) {
    return NextResponse.json({
      success: false,
      error: 'SPARK_API_TOKEN environment variable is not set'
    }, { status: 500 })
  }
  
  try {
    await connectDB()
    
    console.log('Starting bulk agent import...')
    const startTime = Date.now()
    
    // Create Spark API client
    const sparkApi = axios.create({
      baseURL: SPARK_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata.metadata=minimal',
        'X-SparkApi-User-Agent': 'RoofLeadsPro/1.0',
        'Authorization': `Bearer ${SPARK_API_TOKEN}`
      }
    })
    
    // Check API connectivity
    try {
      const systemResponse = await sparkApi.get('/Reso/OData/Member?$top=1')
      console.log('API connection successful:', systemResponse.data?.value?.[0]?.MemberFullName || 'Connected')
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Spark API',
        message: error.message
      }, { status: 500 })
    }
    
    // Track results
    const results = {
      totalFetched: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    // Fetch all agents in pages
    let currentPage = 1
    const pageSize = 100
    let totalPages = 1
    let nextLink = `/Reso/OData/Member?$top=${pageSize}` // Initial request
    let allAgentsProcessed = false
    
    while (!allAgentsProcessed && nextLink) {
      console.log(`Fetching page ${currentPage} of agents...`)
      
      try {
        // Fetch agents from Spark API using OData format
        const response = await sparkApi.get(nextLink)
        
        // Check if we have results
        if (!response.data?.value || response.data.value.length === 0) {
          console.log('No more agents to process')
          break
        }
        
        const agents = response.data.value
        results.totalFetched += agents.length
        
        // Get next link for pagination
        nextLink = response.data['@odata.nextLink'] 
          ? response.data['@odata.nextLink'].replace(SPARK_API_URL, '') 
          : null
        
        if (currentPage === 1) {
          // Estimate total pages based on first response
          // OData might not provide total count directly
          console.log(`Processing first page with ${agents.length} agents`)
        }
        
        // Process agents in this page
        const processedAgents = await Promise.all(agents.map(async (agent: any) => {
          try {
            // Format agent data to match our schema
            const agentData = {
              memberKey: agent.MemberKey,
              memberKeyNumeric: parseInt(agent.MemberKey),
              memberMlsId: agent.MemberMlsId,
              fullName: agent.MemberFullName,
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
            const existingAgent = await MLSAgent.findOne({ memberKey: agent.MemberKey })
            
            if (existingAgent) {
              // Update existing agent
              await MLSAgent.updateOne(
                { memberKey: agent.MemberKey },
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
            const errorMessage = `Error processing agent ${agent.MemberKey}: ${error.message}`
            console.error(errorMessage)
            results.errors.push(errorMessage)
            return null
          }
        }))
        
        // Move to next page
        currentPage++
        
        // Check if we've processed all pages (no more nextLink)
        if (!nextLink) {
          allAgentsProcessed = true
        }
        
        // Optional parameter to limit number of pages (for testing)
        const maxPages = parseInt(searchParams.get('maxPages') || '0', 10)
        if (maxPages > 0 && currentPage > maxPages) {
          console.log(`Reached configured max pages limit (${maxPages})`)
          allAgentsProcessed = true
        }
        
        // Add a small delay between pages to avoid rate limiting
        if (!allAgentsProcessed) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
      } catch (error: any) {
        const errorMessage = `Error fetching page ${currentPage}: ${error.message}`
        console.error(errorMessage)
        results.errors.push(errorMessage)
        break
      }
    }
    
    const duration = (Date.now() - startTime) / 1000
    console.log(`Agent import completed in ${duration.toFixed(2)} seconds`)
    
    // Return results
    return NextResponse.json({
      success: true,
      ...results,
      pagesProcessed: currentPage - 1,
      totalPages,
      duration: `${duration.toFixed(2)} seconds`,
      errorSamples: results.errors.slice(0, 10) // Return just the first 10 errors
    })
    
  } catch (error: any) {
    console.error('Error importing agents:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred while importing agents'
    }, { status: 500 })
  }
} 