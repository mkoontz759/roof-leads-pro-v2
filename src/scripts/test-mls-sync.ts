import { syncMLSData } from '../lib/sync/mls-sync.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSync() {
  try {
    console.log('\n1. Starting MLS Sync Test...')
    
    // Get current counts
    const beforeCounts = {
      transactions: await prisma.transaction.count(),
      agents: await prisma.agent.count()
    }
    console.log('Current database counts:', beforeCounts)

    // Run sync
    console.log('\n2. Running sync...')
    const result = await syncMLSData()
    console.log('Sync completed:', result)

    // Get new counts
    const afterCounts = {
      transactions: await prisma.transaction.count(),
      agents: await prisma.agent.count()
    }
    console.log('\n3. Updated database counts:', afterCounts)
    
    // Show sample data
    console.log('\n4. Sample Transaction:')
    const sampleTransaction = await prisma.transaction.findFirst({
      include: {
        agent: true
      }
    })
    console.log(JSON.stringify(sampleTransaction, null, 2))

    console.log('\nTest completed successfully!')
  } catch (error) {
    console.error('\nTest failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testSync() 