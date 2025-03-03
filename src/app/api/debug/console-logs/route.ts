import { NextResponse } from 'next/server'

// Store console logs
let consoleLogs: string[] = []

// Hook original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
}

// Add consoleHooked property to globalThis
declare global {
  var __consoleHooked: boolean
}

// Install hooks if not already installed
if (typeof global.__consoleHooked === 'undefined') {
  // Wrap console methods to capture logs
  console.log = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    consoleLogs.push(`[LOG] ${message}`)
    originalConsole.log.apply(console, args)
  }

  console.error = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    consoleLogs.push(`[ERROR] ${message}`)
    originalConsole.error.apply(console, args)
  }

  console.warn = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    consoleLogs.push(`[WARN] ${message}`)
    originalConsole.warn.apply(console, args)
  }

  console.info = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    consoleLogs.push(`[INFO] ${message}`)
    originalConsole.info.apply(console, args)
  }

  global.__consoleHooked = true
  
  // Add a test log to confirm hooks are installed
  console.log('Console logging hooks installed successfully')
}

// Limit logs array to 1000 entries
function trimLogs() {
  if (consoleLogs.length > 1000) {
    consoleLogs = consoleLogs.slice(-1000)
  }
}

export async function GET(request: Request) {
  // Add a test log on each request
  console.log(`Console logs endpoint called at ${new Date().toISOString()}`)
  
  // Process URL parameters
  const url = new URL(request.url)
  const clearParam = url.searchParams.get('clear')
  
  // Clear logs if requested
  if (clearParam === 'true') {
    consoleLogs = []
    return NextResponse.json({
      success: true,
      message: 'Logs cleared',
      logs: []
    })
  }
  
  trimLogs()
  
  return NextResponse.json({
    success: true,
    logs: consoleLogs,
    count: consoleLogs.length
  })
}

export async function DELETE() {
  consoleLogs = []
  return NextResponse.json({
    success: true,
    message: 'Logs cleared'
  })
} 