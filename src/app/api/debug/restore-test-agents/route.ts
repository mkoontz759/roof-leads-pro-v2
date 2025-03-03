import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSSource, MLSAssociation } from '@/lib/models/mls'

export async function GET(request: Request) {
  try {
    await connectDB()
    
    // Get current agent count
    const currentCount = await MLSAgent.countDocuments()
    console.log(`Current agent count before restoration: ${currentCount}`)
    
    // Create test agents
    const testAgents = [
      {
        memberKey: "test1",
        memberKeyNumeric: 1001,
        fullName: "John Smith",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        phone: "555-123-4567",
        officeName: "Best Realty",
        source: MLSSource.SPARK,
        sourceId: "test1",
        association: MLSAssociation.AAR,
        pendingListings: [],
        updatedAt: new Date()
      },
      {
        memberKey: "test2",
        memberKeyNumeric: 1002,
        fullName: "Jane Doe",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        phone: "555-987-6543",
        officeName: "Premier Properties",
        source: MLSSource.SPARK,
        sourceId: "test2",
        association: MLSAssociation.AAR,
        pendingListings: [],
        updatedAt: new Date()
      },
      {
        memberKey: "test3",
        memberKeyNumeric: 1003,
        fullName: "Robert Johnson",
        firstName: "Robert",
        lastName: "Johnson",
        email: "robert@example.com",
        phone: "555-555-5555",
        officeName: "Elite Homes",
        source: MLSSource.SPARK,
        sourceId: "test3",
        association: MLSAssociation.AAR,
        pendingListings: [],
        updatedAt: new Date()
      },
      {
        memberKey: "test4",
        memberKeyNumeric: 1004,
        fullName: "Maria Garcia",
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria@example.com", 
        phone: "555-444-3333",
        officeName: "Garcia Realty",
        source: MLSSource.SPARK,
        sourceId: "test4",
        association: MLSAssociation.AAR,
        pendingListings: [],
        updatedAt: new Date()
      },
      {
        memberKey: "test5",
        memberKeyNumeric: 1005,
        fullName: "David Wilson",
        firstName: "David",
        lastName: "Wilson",
        email: "david@example.com",
        phone: "555-222-1111",
        officeName: "Wilson Properties",
        source: MLSSource.SPARK,
        sourceId: "test5",
        association: MLSAssociation.AAR,
        pendingListings: [],
        updatedAt: new Date()
      }
    ]
    
    // Insert or update test agents
    const results = await Promise.all(
      testAgents.map(agent => 
        MLSAgent.updateOne(
          { memberKey: agent.memberKey },
          { $set: agent },
          { upsert: true }
        )
      )
    )
    
    const newCount = await MLSAgent.countDocuments()
    console.log(`Agent count after restoration: ${newCount}`)
    
    return NextResponse.json({
      success: true,
      previousCount: currentCount,
      newCount: newCount,
      testAgentsAdded: testAgents.length,
      results: results.map(r => ({ 
        matched: r.matchedCount, 
        modified: r.modifiedCount,
        upserted: r.upsertedCount
      }))
    })
    
  } catch (error: any) {
    console.error('Error restoring test agents:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 