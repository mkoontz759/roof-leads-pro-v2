import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSAgent } from '@/lib/models/mls'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    // Check for authorization
    if (!key || key !== (process.env.CRON_SECRET || 'localdev')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    await connectDB()
    
    console.log('Starting agent data cleanup...')
    
    // Count total agents before cleanup
    const totalAgentsBefore = await MLSAgent.countDocuments()
    
    // Define criteria for identifying generated data
    const generatedEmailPattern = /@sparkre\.com$/
    const generatedPhonePattern = /^\(\d{3}\) \d{3}-\d{4}$/
    
    // Known fake names we previously generated
    const knownFakeNames = [
      'Robert Wilson',
      'Sarah Johnson',
      'Michael Williams',
      'Jennifer Brown',
      'David Miller',
      'Lisa Davis',
      'James Wilson',
      'Emily Taylor'
    ]
    
    // Find agents with generated data
    const generatedAgents = await MLSAgent.find({
      $or: [
        { email: { $regex: generatedEmailPattern } },
        { phone: { $regex: generatedPhonePattern } },
        { fullName: { $in: knownFakeNames } }
      ]
    }).lean()
    
    console.log(`Found ${generatedAgents.length} agents with generated data`)
    
    // Delete the agents with generated data
    if (generatedAgents.length > 0) {
      const deleteResult = await MLSAgent.deleteMany({
        _id: { $in: generatedAgents.map(agent => agent._id) }
      })
      
      console.log(`Deleted ${deleteResult.deletedCount} agents`)
    }
    
    // Count total agents after cleanup
    const totalAgentsAfter = await MLSAgent.countDocuments()
    
    return NextResponse.json({
      success: true,
      message: 'Agent data cleanup completed',
      stats: {
        totalAgentsBefore,
        totalAgentsAfter,
        agentsRemoved: totalAgentsBefore - totalAgentsAfter,
        generatedAgentsFound: generatedAgents.length
      },
      examples: generatedAgents.slice(0, 5).map(agent => ({
        name: agent.fullName,
        email: agent.email,
        phone: agent.phone
      }))
    })
  } catch (error) {
    console.error('Error cleaning agent data:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to clean agent data',
      error: (error as Error).message
    }, { status: 500 })
  }
} 