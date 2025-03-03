import { NextResponse } from 'next/server'
import { syncSparkData } from '@/lib/services/spark-sync'

// Store logs locally for this specific execution
let syncLogs: string[] = []

// Create a function to add logs
function logMessage(level: 'info' | 'error' | 'warn', message: string) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`
  syncLogs.push(logEntry)
  console[level](message)
}

export async function GET() {
  // Clear logs for this execution
  syncLogs = []
  
  try {
    logMessage('info', '🔄 Starting debug sync...')
    
    const result = await syncSparkData('full')
    
    logMessage('info', `✅ Sync completed with ${result.listings?.processed || 0} listings and ${result.agents?.processed || 0} agents`)
    
    return NextResponse.json({
      success: true,
      result,
      logs: syncLogs
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logMessage('error', `❌ Sync failed: ${errorMessage}`)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      logs: syncLogs
    }, { status: 500 })
  }
} 