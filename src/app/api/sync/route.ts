import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMLSToken, getNewPendingContracts } from '@/lib/mls-auth'
import type { MLSTransaction, MLSAgent } from '@/lib/types/mls'

async function syncAgents(agents: MLSAgent[]) {
  console.log(`Syncing ${agents.length} agents...`)
  
  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { MemberKey: agent.MemberKey },
      update: {
        MemberFirstName: agent.MemberFirstName,
        MemberLastName: agent.MemberLastName,
        MemberEmail: agent.MemberEmail,
        PreferredPhone: agent.PreferredPhone,
        OfficeName: agent.OfficeName,
      },
      create: {
        MemberKey: agent.MemberKey,
        MemberFirstName: agent.MemberFirstName,
        MemberLastName: agent.MemberLastName,
        MemberEmail: agent.MemberEmail,
        PreferredPhone: agent.PreferredPhone,
        OfficeName: agent.OfficeName,
      },
    })
  }
}

async function syncTransactions(transactions: MLSTransaction[]) {
  console.log(`Syncing ${transactions.length} transactions...`)
  
  for (const transaction of transactions) {
    const existing = await prisma.transaction.findUnique({
      where: { ListingKey: transaction.ListingKey },
      include: { statusChanges: true }
    })

    // Check for status change
    if (existing && existing.StandardStatus !== transaction.StandardStatus) {
      await prisma.statusChange.create({
        data: {
          transactionId: existing.id,
          oldStatus: existing.StandardStatus as any, // Cast to enum
          newStatus: transaction.StandardStatus as any, // Cast to enum
          daysOnMarket: Math.floor((new Date().getTime() - new Date(existing.ListDate).getTime()) / (1000 * 60 * 60 * 24))
        }
      })
    }

    // Update or create transaction
    await prisma.transaction.upsert({
      where: { ListingKey: transaction.ListingKey },
      update: {
        ListPrice: transaction.ListPrice,
        StandardStatus: transaction.StandardStatus,
        ModificationTimestamp: new Date(transaction.ModificationTimestamp),
        // ... other fields
      },
      create: {
        ListingKey: transaction.ListingKey,
        ListPrice: transaction.ListPrice,
        ListAgentKey: transaction.ListAgentKey,
        StandardStatus: transaction.StandardStatus,
        ModificationTimestamp: new Date(transaction.ModificationTimestamp),
        ListDate: new Date(transaction.ListDate),
        StreetNumberNumeric: transaction.StreetNumberNumeric,
        StreetName: transaction.StreetName,
        City: transaction.City,
        StateOrProvince: transaction.StateOrProvince,
        PostalCode: transaction.PostalCode,
        // ... other fields
      }
    })
  }
}

export async function GET() {
  try {
    // Log sync start
    const syncLog = await prisma.syncLog.create({
      data: {
        status: 'In Progress',
        type: 'Full',
        startTime: new Date()
      }
    })

    // Get MLS token
    const token = await getMLSToken()
    
    // Fetch data
    const { listings, agents } = await getNewPendingContracts(token)
    
    // Sync data
    await syncAgents(agents)
    await syncTransactions(listings)

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'Success',
        endTime: new Date(),
        recordsProcessed: listings.length + agents.length
      }
    })

    return NextResponse.json({ 
      success: true,
      agentCount: agents.length,
      transactionCount: listings.length
    })
  } catch (error) {
    console.error('Sync Error:', error)
    return NextResponse.json(
      { error: 'Failed to sync MLS data' },
      { status: 500 }
    )
  }
} 