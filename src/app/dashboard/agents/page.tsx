import mongoose from 'mongoose'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MLSAgent, MLSListing, ListingLifecycle } from '@/lib/models/mls'
import { connectDB } from '@/lib/mongodb'
import { Phone, Mail, Building2, Hash } from 'lucide-react'
import { AgentsPagination } from './agents-pagination'
import { PageSizeSelector } from './page-size-selector'
import { AgentSorts } from './agent-filters'
import { StatsCards } from './stats-cards'
import { AgentCard } from './agent-card'
import { Metadata } from "next"
import { getServerSession } from "next-auth/next"

export const metadata: Metadata = {
  title: "Agents | Roof Leads Pro",
  description: "View and manage agents",
}

// Define interface for agent listings
interface AgentListing {
  listingKey: string;
  address: string;
  streetNumberNumeric: string;
  streetName: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  listPrice: number;
  status: ListingLifecycle;
  statusChangeDate: Date;
}

// Interface for a listing with basic information
interface ListingInfo {
  _id: string
  listPrice: number
  unparsedAddress: string
  lifecycleStatus: ListingLifecycle
  listDate: Date
  propertyType: string
  bedrooms: number
  bathrooms: number
}

async function getAgentsWithListings(sortOption: string, page: number, limit: number, session: any) {
  try {
    const connection = await connectDB();
    if (!connection || !connection.db) {
      throw new Error("Failed to connect to database");
    }
    const db = connection.db;
    
    console.log("Connected to database successfully");
    
    // Get user's role and zip code assignments
    const user = await db.collection('users').findOne({ 
      email: session?.user?.email 
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Create a sort stage based on the sort option
    let sortStage: Record<string, number> = {}
    
    switch (sortOption) {
      case 'most-active':
        sortStage = { "activeCount": -1 }
        break
      case 'most-pending':
        sortStage = { "pendingCount": -1 }
        break
      case 'most-total':
        sortStage = { "totalListings": -1 }
        break
      case 'recent':
        sortStage = { "listDate": -1 }
        break
      case 'price-high':
        sortStage = { "listPrice": -1 }
        break
      case 'price-low':
        sortStage = { "listPrice": 1 }
        break
      default:
        sortStage = { "totalListings": -1 }
    }

    console.log("Using sort stage:", sortStage);

    // Create zip code filter if user is not an admin
    let zipCodeFilter = {}
    if (user.role === 'USER' && user.assignedZipCodes?.length > 0) {
      const activeZipCodes = user.assignedZipCodes
        .filter((assignment: any) => assignment.active)
        .map((assignment: any) => assignment.zipCode)
      
      zipCodeFilter = {
        'listings.standardFields.postalCode': { $in: activeZipCodes }
      }
    }

    // Pipeline to get agents with active and pending listings
    const pipeline = [
      {
        $lookup: {
          from: 'mlslistings',
          let: { agentKey: '$memberKey' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    '$listAgentKey',
                    '$$agentKey'
                  ]
                }
              }
            }
          ],
          as: 'listings'
        }
      },
      {
        $match: {
          listings: { $ne: [] },
          ...zipCodeFilter
        }
      },
      {
        $addFields: {
          activeListings: {
            $filter: {
              input: '$listings',
              as: 'listing',
              cond: { $eq: ['$$listing.standardFields.standardStatus', 'Active'] }
            }
          },
          pendingListings: {
            $filter: {
              input: '$listings',
              as: 'listing',
              cond: { $eq: ['$$listing.standardFields.standardStatus', 'Active Under Contract'] }
            }
          }
        }
      },
      {
        $addFields: {
          totalListings: { $size: '$listings' },
          activeCount: { $size: '$activeListings' },
          pendingCount: { $size: '$pendingListings' }
        }
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortStage },
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ]
        }
      }
    ]

    console.log("Executing aggregation pipeline:", JSON.stringify(pipeline, null, 2));
    const result = await db.collection('mlsagents').aggregate(pipeline).toArray()
    console.log("Pipeline execution completed. Result:", JSON.stringify(result, null, 2));
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error("No results returned from aggregation pipeline");
    }
    
    const agents = result[0].data || []
    const totalMatchingAgents = result[0].metadata[0]?.total || 0
    
    console.log("Found matching agents:", totalMatchingAgents);
    if (agents.length > 0) {
      console.log("Sample agent listings:", JSON.stringify(agents[0].listings, null, 2));
    }
    
    // Count total active and pending listings (filtered by zip code if needed)
    const listingCountPipeline = [
      ...(user.role === 'USER' && user.assignedZipCodes?.length > 0 ? [{
        $match: {
          'standardFields.postalCode': {
            $in: user.assignedZipCodes
              .filter((assignment: any) => assignment.active)
              .map((assignment: any) => assignment.zipCode)
          }
        }
      }] : []),
      {
        $group: {
          _id: "$standardFields.standardStatus",
          count: { $sum: 1 }
        }
      }
    ]
    
    console.log("Counting listings...");
    const listingCounts = await db.collection('mlslistings').aggregate(listingCountPipeline).toArray()
    console.log("Listing counts:", listingCounts);
    
    const activeListingsCount = listingCounts.find((c: any) => c._id === "Active")?.count || 0
    const pendingListingsCount = listingCounts.find((c: any) => c._id === "Active Under Contract")?.count || 0
    
    // Get the last sync time
    console.log("Getting last sync time...");
    
    const lastSuccessfulSync = await db.collection('synchistories').findOne({ 
      status: 'success' 
    }, {
      sort: { endTime: -1 }
    });
    
    console.log("Last successful sync:", lastSuccessfulSync);
    
    let lastSyncedAt = null;
    if (lastSuccessfulSync && lastSuccessfulSync.endTime) {
      lastSyncedAt = lastSuccessfulSync.endTime;
    } else {
      // If no successful sync found, try to get any sync
      const anySyncRecord = await db.collection('synchistories').findOne({}, {
        sort: { startTime: -1 }
      });
      
      if (anySyncRecord && anySyncRecord.startTime) {
        lastSyncedAt = anySyncRecord.startTime;
      }
    }
    
    console.log("Last synced at:", lastSyncedAt);
    
    return {
      agents,
      totalAgents: totalMatchingAgents,
      totalMatchingAgents,
      lastSyncedAt,
      totalActiveListings: activeListingsCount,
      totalPendingListings: pendingListingsCount
    }
  } catch (error) {
    console.error("Failed to fetch agents:", error)
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    throw new Error(`Failed to fetch agents: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

interface AgentForCard {
  memberKey: string
  fullName: string
  email?: string
  phone?: string
  officeName?: string
  activeListingsCount?: number
  pendingListingsCount?: number
  listings: any[]
}

export default async function AgentsView({ 
  searchParams 
}: { 
  searchParams: { 
    sort?: string, 
    page?: string 
  } 
}) {
  const currentPage = parseInt(searchParams.page || '1')
  const sortOption = searchParams.sort || 'most-total'
  const limit = 9 // Agents per page
  
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return (
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Agents</h1>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Not authenticated</h2>
            <p className="text-muted-foreground">
              Please sign in to view agents.
            </p>
          </div>
        </div>
      )
    }

    const { 
      agents, 
      totalAgents, 
      totalMatchingAgents, 
      lastSyncedAt, 
      totalActiveListings, 
      totalPendingListings 
    } = await getAgentsWithListings(sortOption, currentPage, limit, session)
    
    const totalPages = Math.ceil(totalMatchingAgents / limit)
    
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Agents</h1>
        
        <StatsCards 
          totalAgents={totalMatchingAgents} 
          totalActiveListings={totalActiveListings}
          totalPendingListings={totalPendingListings}
          lastSyncedAt={lastSyncedAt} 
        />
        
        <AgentSorts />
        
        {agents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent: any) => {
                // Format the agent data to match AgentCardProps
                const formattedAgent: AgentForCard = {
                  memberKey: agent.memberKey,
                  fullName: agent.fullName,
                  email: agent.email,
                  phone: agent.phone,
                  officeName: agent.officeName,
                  activeListingsCount: agent.activeCount,
                  pendingListingsCount: agent.pendingCount,
                  listings: agent.listings.map((listing: any) => ({
                    listingKey: listing._id,
                    address: listing.unparsedAddress || listing.sourceFields?.UnparsedAddress || 'No address available',
                    streetNumberNumeric: listing.streetNumberNumeric || listing.standardFields?.streetNumberNumeric || '',
                    streetName: listing.streetName || listing.standardFields?.streetName || '',
                    city: listing.city || listing.standardFields?.city || '',
                    stateOrProvince: listing.stateOrProvince || listing.standardFields?.stateOrProvince || '',
                    postalCode: listing.postalCode || listing.standardFields?.postalCode || '',
                    listPrice: listing.listPrice || listing.standardFields?.listPrice || 0,
                    status: listing.standardFields?.standardStatus || listing.lifecycleStatus || 'Unknown',
                    statusChangeDate: listing.sourceFields?.ModificationTimestamp || listing.modificationTimestamp || new Date()
                  }))
                }
                
                return (
                  <AgentCard 
                    key={agent._id} 
                    agent={formattedAgent}
                  />
                )
              })}
            </div>
            
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <AgentsPagination 
                  pagination={{
                    currentPage: currentPage,
                    pageCount: totalPages,
                    total: totalMatchingAgents,
                    pageSize: limit
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No agents found</h2>
            <p className="text-muted-foreground">
              There are no agents with active or pending listings.
            </p>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Error loading agents:", error)
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Agents</h1>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Error loading agents</h2>
          <p className="text-muted-foreground">
            There was an error loading the agents. Please try again later.
          </p>
        </div>
      </div>
    )
  }
}

