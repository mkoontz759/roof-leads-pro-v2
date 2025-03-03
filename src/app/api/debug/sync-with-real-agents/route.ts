import { NextResponse } from 'next/server'
import { syncSparkData } from '@/lib/services/spark-sync'

const API_KEY = process.env.DEBUG_API_KEY || 'localdev'

/**
 * Debug endpoint to sync listings with real agent data from the Spark Member API
 * This endpoint will:
 * 1. Clear existing agent data
 * 2. Sync all listings with real agent data from the Member API
 * 3. Return information about the sync process
 */
export async function GET(request: Request) {
  // Get the API key from query parameters for authentication
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  // Validate the API key
  if (key !== API_KEY) {
    return NextResponse.json({
      error: 'Invalid API key',
      success: false
    }, { status: 401 });
  }

  try {
    console.log('Starting full sync with real agent data...');
    
    // Execute the full sync process which now uses real agent data
    const result = await syncSparkData('full');
    
    return NextResponse.json({
      message: 'Successfully synced with real agent data',
      result,
      success: true
    });
  } catch (error) {
    console.error('Error syncing with real agent data:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to sync with real agent data',
      success: false
    }, { status: 500 });
  }
} 