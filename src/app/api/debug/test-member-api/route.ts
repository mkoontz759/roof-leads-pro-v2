import { NextResponse } from 'next/server'
import axios from 'axios'
import { connectDB } from '@/lib/mongodb'

const API_KEY = process.env.CRON_SECRET || 'localdev'
const SPARK_API_TOKEN = process.env.SPARK_API_TOKEN
const SPARK_API_URL = process.env.SPARK_API_URL || 'https://replication.sparkapi.com'

interface ServiceResponse {
  status: string;
  data?: any;
  message?: string;
  response?: any;
}

interface TestResults {
  services: Record<string, ServiceResponse>;
  apiInformation: any;
  listingWithAgentData: any;
  errorDetails: Record<string, any>;
}

/**
 * This endpoint tests various Spark API endpoints to retrieve real agent data
 * instead of generating fake agent information
 */
export async function GET(request: Request) {
  try {
    // Simple API key authentication
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('key')
    
    if (!apiKey || apiKey !== API_KEY) {
      console.log('Unauthorized attempt to access debug endpoint')
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    // Create Spark API client
    const sparkApi = axios.create({
      baseURL: SPARK_API_URL,
      headers: {
        'Authorization': `Bearer ${SPARK_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('Testing Spark API for agent data...')
    
    // Object to store all our results
    const results: TestResults = {
      services: {},
      apiInformation: null,
      listingWithAgentData: null,
      errorDetails: {}
    }
    
    // First try to get API information to confirm our token works
    try {
      const systemInfoResponse = await sparkApi.get('/system')
      results.apiInformation = systemInfoResponse.data
    } catch (error) {
      results.errorDetails.systemInfo = {
        message: (error as Error).message,
        response: (error as any).response?.data
      }
    }
    
    // Try different potential endpoints for agent/member data
    const endpointsToTry = [
      '/Reso/OData/Member',
      '/accounts',
      '/members',
      '/agents',
      '/offices'
    ]
    
    for (const endpoint of endpointsToTry) {
      try {
        const response = await sparkApi.get(endpoint)
        results.services[endpoint] = {
          status: 'success',
          data: response.data
        }
      } catch (error) {
        results.services[endpoint] = {
          status: 'error',
          message: (error as Error).message,
          response: (error as any).response?.data
        }
      }
    }
    
    // Get a sample listing to see what agent data is included
    try {
      const listingResponse = await sparkApi.get('/listings', {
        params: {
          _limit: 1,
          _pagination: 1,
          _select: '*', // Get all fields to inspect agent-related data
          _filter: "StandardStatus eq 'Active'"
        }
      })
      
      if (listingResponse.data?.D?.Results?.length > 0) {
        results.listingWithAgentData = listingResponse.data.D.Results[0]
      }
    } catch (error) {
      results.errorDetails.listingError = {
        message: (error as Error).message,
        response: (error as any).response?.data
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Spark API test completed',
      results
    })
  } catch (error) {
    console.error('Error testing Spark API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to test Spark API',
      error: (error as Error).message,
      errorObject: {
        name: (error as Error).name,
        stack: (error as Error).stack,
        response: (error as any).response?.data
      }
    }, { status: 500 })
  }
} 