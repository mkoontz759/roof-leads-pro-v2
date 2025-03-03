import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, Users, ClipboardList } from "lucide-react"
import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing } from '@/lib/models/mls'
import { DashboardCharts } from './components/dashboard-charts'
import { StatsCards } from './components/stats-cards'
import mongoose from 'mongoose'
import { SyncHistory } from '@/lib/models/sync-history'

async function getStats() {
  await connectDB()
  
  try {
    // Total agents and listings counts
    const totalAgents = await MLSAgent.countDocuments({})
    const totalListings = await MLSListing.countDocuments({})
    
    // Get list of valid agent keys
    const validAgentKeys = await MLSAgent.distinct('memberKey')
    
    // Count pending transactions (listings with pending status)
    const totalPendingTransactions = await MLSListing.countDocuments({
      'standardFields.standardStatus': 'Active Under Contract'
    })
    
    // Count active listings
    const totalActiveListings = await MLSListing.countDocuments({
      'standardFields.standardStatus': 'Active'
    })
    
    // Count valid agents with active listings
    const validAgentsWithActiveListings = await MLSListing.aggregate([
      { 
        $match: { 
          'standardFields.standardStatus': 'Active',
          listAgentKey: { $in: validAgentKeys }
        } 
      },
      { $group: { _id: "$listAgentKey" } },
      { $count: "uniqueAgents" }
    ]).exec()
    
    // Count invalid agent keys in active listings
    const invalidAgentKeysActive = await MLSListing.countDocuments({
      'standardFields.standardStatus': 'Active',
      listAgentKey: { $nin: validAgentKeys, $ne: null }
    })
    
    // Count valid agents with pending listings
    const validAgentsWithPendingListings = await MLSListing.aggregate([
      { 
        $match: { 
          'standardFields.standardStatus': 'Active Under Contract',
          listAgentKey: { $in: validAgentKeys }
        } 
      },
      { $group: { _id: "$listAgentKey" } },
      { $count: "uniqueAgents" }
    ]).exec()
    
    // Count invalid agent keys in pending listings
    const invalidAgentKeysPending = await MLSListing.countDocuments({
      'standardFields.standardStatus': 'Active Under Contract',
      listAgentKey: { $nin: validAgentKeys, $ne: null }
    })
    
    // Get the last sync time from SyncHistory collection
    let lastSyncedAt = new Date() // Default value in case no sync record is found
    
    try {
      // Find the most recent successful sync
      const lastSuccessfulSync = await SyncHistory.findOne({ 
        status: 'success' 
      }).sort({ 
        endTime: -1 
      }).lean()
      
      if (lastSuccessfulSync && lastSuccessfulSync.endTime) {
        lastSyncedAt = lastSuccessfulSync.endTime
      } else {
        // If no successful sync is found, try to get any sync record
        const anySyncRecord = await SyncHistory.findOne().sort({ 
          startTime: -1 
        }).lean()
        
        if (anySyncRecord && anySyncRecord.startTime) {
          lastSyncedAt = anySyncRecord.startTime
        }
      }
      
      console.log('Last sync time from SyncHistory:', lastSyncedAt)
    } catch (error) {
      console.error('Error getting last sync time from SyncHistory:', error)
    }
    
    // Get daily trend of new pending transactions over last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    // Generate an array of the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date
    }).reverse()
    
    const dailyPendingTrend = await MLSListing.aggregate([
      {
        $match: {
          'standardFields.standardStatus': 'Active Under Contract',
          "statusHistory.changedAt": { $gte: sevenDaysAgo }
        }
      },
      {
        $unwind: "$statusHistory"
      },
      {
        $match: {
          "statusHistory.toStatus": "Under Contract",
          "statusHistory.changedAt": { $gte: sevenDaysAgo }
        }
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$statusHistory.changedAt"
            }
          }
        }
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).exec()
    
    // Format the trend data to include all days
    const dailyTrendsWithZeros = last7Days.map(date => {
      const dateStr = date.toISOString().split('T')[0]
      const found = dailyPendingTrend.find(day => day._id === dateStr)
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        newPendings: found?.count || 0,
        totalValue: 0 // Add required property with default value
      }
    })
    
    // Get price range distribution of pending listings
    const priceRanges = [
      { min: 0, max: 200000, label: '$0-200k' },
      { min: 200000, max: 400000, label: '$200-400k' },
      { min: 400000, max: 600000, label: '$400-600k' },
      { min: 600000, max: 800000, label: '$600-800k' },
      { min: 800000, max: 1000000, label: '$800k-1M' },
      { min: 1000000, max: 2000000, label: '$1M-2M' },
    ]
    
    const priceRangeDistribution = await MLSListing.aggregate([
      {
        $match: {
          'standardFields.standardStatus': 'Active Under Contract'
        }
      },
      {
        $bucket: {
          groupBy: "$standardFields.listPrice",
          boundaries: [0, 200000, 400000, 600000, 800000, 1000000, 2000000],
          default: "2000000+",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]).exec()
    
    // Format the price distribution data
    const formattedPriceDistribution = priceRangeDistribution.map((range, index) => {
      if (range._id === "2000000+") {
        return { range: "Over $2M", count: range.count }
      }
      return { range: priceRanges[index].label, count: range.count }
    })
    
    return {
      stats: {
        totalAgents,
        totalListings,
        totalPendingTransactions,
        totalActiveListings,
        agentsWithActiveListings: validAgentsWithActiveListings[0]?.uniqueAgents || 0,
        agentsWithPendingListings: validAgentsWithPendingListings[0]?.uniqueAgents || 0,
        invalidAgentKeysActive,
        invalidAgentKeysPending,
        lastSyncedAt
      },
      dailyTrends: dailyTrendsWithZeros,
      priceDistribution: formattedPriceDistribution
    }
  } catch (error) {
    console.error('Error in getStats:', error)
    throw new Error('Failed to get dashboard statistics')
  }
}

export default async function DashboardPage() {
  const { stats, dailyTrends, priceDistribution } = await getStats()
  
  return (
    <div className="grid gap-4 md:gap-8 animate-in">
      <StatsCards 
        totalAgents={stats.totalAgents} 
        totalListings={stats.totalListings} 
        totalPendingTransactions={stats.totalPendingTransactions} 
        lastSyncedAt={stats.lastSyncedAt}
        agentsWithActiveListings={stats.agentsWithActiveListings}
        agentsWithPendingListings={stats.agentsWithPendingListings}
        invalidAgentKeysActive={stats.invalidAgentKeysActive}
        invalidAgentKeysPending={stats.invalidAgentKeysPending}
      />
      <DashboardCharts 
        dailyTrends={dailyTrends} 
        priceDistribution={priceDistribution} 
      />
    </div>
  )
}

