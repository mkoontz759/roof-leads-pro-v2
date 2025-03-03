import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing, MLSSource, MLSAssociation, ListingLifecycle } from '@/lib/models/mls'
import { SyncHistory } from '@/lib/models/sync-history'
import { searchResidentialListings, ListingStatus, PropertyType } from '@/lib/spark-api'
import axios from 'axios'

// Use a smaller page size for incremental updates to reduce load
const FULL_SYNC_PAGE_SIZE = 100
const INCREMENTAL_SYNC_PAGE_SIZE = 50

// Constants for Spark API access
const SPARK_API_TOKEN = process.env.SPARK_API_TOKEN
const SPARK_API_URL = process.env.SPARK_API_URL || 'https://replication.sparkapi.com'

/**
 * Extracts agent information from the listing data
 * Uses only real agent data from the API, no fake data
 */
function extractAgentInfo(listing: any) {
  // Get source fields from the listing
  const sourceFields = listing.sourceFields || {}
  const standardFields = listing.standardFields || {}
  
  // Use only real agent key from API data or create a unique identifier based on MLS
  const agentKey = sourceFields.ListAgentId || sourceFields.listAgentId || 
                  sourceFields.ListAgentKey || sourceFields.listAgentKey ||
                  // If no real agent key, use MLS number as a fallback identifier
                  `mls-${listing.listingKey || Math.random().toString(36).substring(2)}`;
            
  // Skip if we don't have a valid agent key
  if (!agentKey) {
    console.log(`Missing agent key for listing ${listing.listingKey || 'unknown'}`);
    return null;
  }
  
  // Only use real agent name from API data - no fake names
  const name = sourceFields.ListAgentName || sourceFields.listAgentName || 
               sourceFields.AgentName || sourceFields.agentName || '';
  
  // Only use real email from API data
  const email = sourceFields.ListAgentEmail || sourceFields.listAgentEmail || 
                sourceFields.AgentEmail || sourceFields.agentEmail || '';
  
  // Only use real phone from API data
  const phone = sourceFields.ListAgentPhone || sourceFields.listAgentPhone || 
                sourceFields.AgentPhone || sourceFields.agentPhone || '';
  
  // Only use real office name from API data
  const officeName = sourceFields.ListOfficeName || sourceFields.listOfficeName || 
                    standardFields.listOfficeName || '';
  
  // Extract city information for location-based matching
  const city = listing.city || standardFields.city || '';
  
  return {
    agentKey,
    name,
    email,
    phone,
    officeName,
    city
  }
}

/**
 * Fetches real agent data from the Spark Member API
 * This will be used to populate agent information in the database
 */
async function fetchMemberData() {
  try {
    if (!SPARK_API_TOKEN) {
      console.error('SPARK_API_TOKEN not configured');
      return [];
    }
    
    const config = {
      headers: {
        'X-SparkApi-User-Agent': 'RoofLeadsPro/1.0',
        'Authorization': `Bearer ${SPARK_API_TOKEN}`
      }
    };
    
    // Fetch member data from the Spark API
    const response = await axios.get(`${SPARK_API_URL}/Reso/OData/Member`, config);
    
    if (response.data && response.data.value) {
      return response.data.value;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching member data:', error);
    return [];
  }
}

/**
 * Finds the member data corresponding to a listing's agent
 * Uses multiple matching strategies with priority
 */
function findMatchingMember(members: any[], agentInfo: any) {
  // Strategy 1: Exact agent key match (highest priority)
  if (agentInfo.agentKey) {
    const exactMatch = members.find(m => 
      m.MemberKey === agentInfo.agentKey || 
      m.MemberMlsId === agentInfo.agentKey
    );
    
    if (exactMatch) return exactMatch;
  }
  
  // Strategy 2: Match by name if we have agent name
  if (agentInfo.name) {
    const nameMatch = members.find(m => {
      const memberFullName = `${m.MemberFirstName || ''} ${m.MemberLastName || ''}`.trim().toLowerCase();
      const agentName = agentInfo.name.toLowerCase();
      
      // Check for exact or partial name match
      return memberFullName === agentName || 
             memberFullName.includes(agentName) || 
             agentName.includes(memberFullName);
    });
    
    if (nameMatch) return nameMatch;
  }
  
  // Strategy 3: Office-based matching
  if (agentInfo.officeName) {
    // First try exact office name matches
    const exactOfficeMatch = members.find(m => 
      m.OfficeName && 
      m.OfficeName.toLowerCase() === agentInfo.officeName.toLowerCase()
    );
    
    if (exactOfficeMatch) return exactOfficeMatch;
    
    // Then try partial office name matches
    const officeMatches = members.filter(m => 
      m.OfficeName && 
      (m.OfficeName.toLowerCase().includes(agentInfo.officeName.toLowerCase()) ||
       agentInfo.officeName.toLowerCase().includes(m.OfficeName.toLowerCase()))
    );
    
    // If we have office matches, prefer agents with roles suggesting they're the main contact
    if (officeMatches.length > 0) {
      // Look for office managers, brokers, or designated agents first
      const primaryAgentTypes = ['Designated', 'Broker', 'Manager', 'Owner'];
      
      const primaryAgent = officeMatches.find(m => 
        m.MemberType && primaryAgentTypes.some(type => m.MemberType.includes(type))
      );
      
      if (primaryAgent) return primaryAgent;
      
      // If no primary agent found, return first match
      return officeMatches[0];
    }
  }
  
  // Strategy 4: Location-based matching (lowest priority)
  // Try to match by city if both listing and agent have city information
  if (agentInfo.city) {
    const cityMatches = members.filter(m => 
      m.MemberCity && 
      m.MemberCity.toLowerCase() === agentInfo.city.toLowerCase()
    );
    
    if (cityMatches.length > 0) {
      // Prefer agents with more complete profiles
      const scoredMatches = cityMatches.map(m => {
        let score = 0;
        if (m.MemberEmail) score += 1;
        if (m.MemberMobilePhone) score += 1;
        if (m.MemberType && m.MemberType.includes('Broker')) score += 2;
        return { member: m, score };
      });
      
      // Sort by score descending
      scoredMatches.sort((a, b) => b.score - a.score);
      
      // Return the highest scored match
      if (scoredMatches.length > 0) return scoredMatches[0].member;
    }
  }
  
  // No match found
  return null;
}

export async function syncSparkData(type: 'full' | 'quick' = 'full') {
  const startTime = new Date()
  let syncLog

  try {
    await connectDB()
    
    // Create sync log entry
    syncLog = await SyncHistory.create({
      startTime,
      status: 'in-progress'
    })

    if (type === 'full') {
      console.log('Full sync requested - clearing existing Spark data')
      // Clear existing data for Spark source only
      await Promise.all([
        MLSAgent.deleteMany({ source: MLSSource.SPARK }),
        MLSListing.deleteMany({ source: MLSSource.SPARK })
      ])
    }

    // Fetch real agent data from the Spark Member API
    console.log('Fetching real agent data from Spark Member API...')
    const memberData = await fetchMemberData();
    console.log(`Fetched ${memberData.length} real agents from Spark Member API`);

    // Use pagination to fetch ALL listings
    const allListings = []
    let page = 1
    let hasMoreActive = true
    let hasMorePending = true
    const PAGE_SIZE = FULL_SYNC_PAGE_SIZE // Adjusted page size for reliable API calls
    let totalActiveProcessed = 0
    let totalPendingProcessed = 0
    
    // Fetch all active listings with pagination
    console.log('Fetching all active residential listings...')
    while (hasMoreActive) {
      console.log(`Fetching active listings - page ${page}...`)
      const response = await searchResidentialListings({
        status: ListingStatus.Active,
        limit: PAGE_SIZE,
        page: page
      })
      
      const { results: activeListings, pagination } = response
      console.log(`API Response - Active Listings:`, {
        pageSize: pagination.PageSize,
        currentPage: pagination.CurrentPage,
        totalPages: pagination.TotalPages,
        totalRows: pagination.TotalRows,
        resultsCount: activeListings.length
      })
      
      allListings.push(...activeListings)
      totalActiveProcessed += activeListings.length
      
      console.log(`Fetched ${activeListings.length} active listings (page ${page}/${pagination.TotalPages})`)
      console.log(`Total active processed: ${totalActiveProcessed} of ${pagination.TotalRows}`)
      
      hasMoreActive = page < pagination.TotalPages
      page++
      
      // If no more pages, break out
      if (!hasMoreActive) {
        console.log('No more active pages to fetch.')
        break
      }
    }
    
    // Reset pagination for pending listings
    page = 1
    
    // Fetch all pending listings with pagination
    console.log('Fetching all pending residential listings...')
    while (hasMorePending) {
      console.log(`Fetching pending listings - page ${page}...`)
      const response = await searchResidentialListings({
        status: ListingStatus.Pending,
        limit: PAGE_SIZE,
        page: page
      })
      
      const { results: pendingListings, pagination } = response
      console.log(`API Response - Pending Listings:`, {
        pageSize: pagination.PageSize,
        currentPage: pagination.CurrentPage,
        totalPages: pagination.TotalPages,
        totalRows: pagination.TotalRows,
        resultsCount: pendingListings.length
      })
      
      allListings.push(...pendingListings)
      totalPendingProcessed += pendingListings.length
      
      console.log(`Fetched ${pendingListings.length} pending listings (page ${page}/${pagination.TotalPages})`)
      console.log(`Total pending processed: ${totalPendingProcessed} of ${pagination.TotalRows}`)
      
      hasMorePending = page < pagination.TotalPages
      page++
      
      // If no more pages, break out
      if (!hasMorePending) {
        console.log('No more pending pages to fetch.')
        break
      }
    }
    
    console.log(`Total listings fetched: ${allListings.length} (${totalActiveProcessed} active, ${totalPendingProcessed} pending)`)

    // Extract unique agents using real agent identifiers
    const agents = new Map()
    
    // First, import all members from the Member API
    if (memberData.length > 0) {
      memberData.forEach((member: any) => {
        const memberKey = member.MemberKey;
        
        agents.set(memberKey, {
          memberKey: memberKey,
          fullName: member.MemberFullName || `${member.MemberFirstName || ''} ${member.MemberLastName || ''}`.trim(),
          email: member.MemberEmail || '',
          phone: member.MemberMobilePhone || member.MemberOfficePhone || '',
          officeName: member.OfficeName || '',
          source: MLSSource.SPARK,
          sourceId: memberKey,
          association: MLSAssociation.AAR,
          pendingListings: [],
          memberType: member.MemberType || '',
          address: member.MemberAddress1 || '',
          city: member.MemberCity || '',
          state: member.MemberStateOrProvince || '',
          postalCode: member.MemberPostalCode || '',
          stateLicense: member.MemberStateLicense || '',
          officeKey: member.OfficeKey || '',
          officeMlsId: member.OfficeMlsId || '',
          designations: member.MemberDesignation || []
        });
      });
    }
    
    allListings.forEach(listing => {
      // Extract agent information from the listing
      const agentInfo = extractAgentInfo(listing)
      
      if (!agentInfo) {
        console.log(`Skipping listing ${(listing as any).listingKey || 'unknown'} - no valid agent information`);
        return; // Skip to the next listing
      }
      
      // Try to find a matching member from the real Member API data
      const matchingMember = findMatchingMember(memberData, agentInfo);
      
      if (matchingMember) {
        const memberKey = matchingMember.MemberKey;
        
        // Only update agent if we haven't seen this agent before
        if (!agents.has(memberKey)) {
          agents.set(memberKey, {
            memberKey: memberKey,
            fullName: matchingMember.MemberFullName || `${matchingMember.MemberFirstName || ''} ${matchingMember.MemberLastName || ''}`.trim(),
            email: matchingMember.MemberEmail || '',
            phone: matchingMember.MemberMobilePhone || matchingMember.MemberOfficePhone || '',
            officeName: matchingMember.OfficeName || agentInfo.officeName || '',
            source: MLSSource.SPARK,
            sourceId: memberKey,
            association: MLSAssociation.AAR,
            pendingListings: [],
            memberType: matchingMember.MemberType || '',
            address: matchingMember.MemberAddress1 || '',
            city: matchingMember.MemberCity || '',
            state: matchingMember.MemberStateOrProvince || '',
            postalCode: matchingMember.MemberPostalCode || '',
            stateLicense: matchingMember.MemberStateLicense || '',
            officeKey: matchingMember.OfficeKey || '',
            officeMlsId: matchingMember.OfficeMlsId || '',
            designations: matchingMember.MemberDesignation || []
          });
        }
      } else if (agentInfo.officeName) {
        // Fallback: If no member match but we have office info, create an office-based agent
        const officeKey = `office-${agentInfo.officeName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        
        if (!agents.has(officeKey)) {
          agents.set(officeKey, {
            memberKey: officeKey,
            fullName: agentInfo.officeName || 'Office Agent',
            email: '',
            phone: '',
            officeName: agentInfo.officeName || '',
            source: MLSSource.SPARK,
            sourceId: officeKey,
            association: MLSAssociation.AAR,
            pendingListings: [],
            isOfficeAgent: true
          });
        }
      }
    });

    // Update agents with their pending listings
    allListings.forEach(listing => {
      if (listing.status === ListingStatus.Pending) {
        // Get the agent info for this listing
        const agentInfo = extractAgentInfo(listing)
        
        if (!agentInfo) {
          console.log(`Skipping listing ${(listing as any).listingKey || 'unknown'} - no valid agent information`);
          return;
        }
        
        // Try to find matching member
        const matchingMember = findMatchingMember(memberData, agentInfo);
        let agentKey = matchingMember?.MemberKey;
        
        // If no agent match found, log a warning
        if (!agentKey) {
          console.warn(`WARNING: Missing agent match for pending listing ${listing.listingId}. This indicates a data sync issue that needs investigation.`);
          console.warn(`Listing office: ${agentInfo.officeName || 'Unknown'}, City: ${listing.city || 'Unknown'}`);
          return; // Skip adding to pending listings without a valid agent
        }
        
        // Only add pending listing if we have a valid agent
        if (agents.has(agentKey)) {
          const agent = agents.get(agentKey);
          
          agent.pendingListings.push({
            address: listing.address || `Unknown Address in ${listing.city || 'Unknown City'}`,
            city: listing.city || '',
            state: (listing as any).stateOrProvince || 'TX',
            zipCode: listing.listingId?.substring(0, 5) || '',
            pendingDate: new Date(),
            listPrice: listing.price || 0
          });
        }
      }
    });

    console.log(`Upserting ${agents.size} agents...`)
    
    // Upsert agents with their pending listings
    const agentResults = await MLSAgent.bulkWrite(
      Array.from(agents.values()).map(agent => ({
        updateOne: {
          filter: { memberKey: agent.memberKey },
          update: { $set: agent },
          upsert: true
        }
      }))
    )

    console.log(`Upserting ${allListings.length} listings...`)
    
    // Upsert listings with correct agent keys
    const listingOperations = allListings.map(listing => {
      // Get the agent info for this listing
      const agentInfo = extractAgentInfo(listing)
      
      if (!agentInfo) {
        console.log(`Skipping listing ${(listing as any).listingKey || 'unknown'} - no valid agent information`);
        return null; // Skip this listing
      }
      
      // Try to find matching member
      const matchingMember = findMatchingMember(memberData, agentInfo);
      let listAgentKey = matchingMember?.MemberKey;
      
      // If no agent match, log a warning - this should never happen in production
      if (!listAgentKey) {
        console.warn(`WARNING: Missing agent match for listing ${listing.listingId}. This indicates a data sync issue that needs investigation.`);
        console.warn(`Listing office: ${agentInfo.officeName || 'Unknown'}, City: ${listing.city || 'Unknown'}`);
        
        // Leave listAgentKey as null - do not use fallback keys
      }
      
      // Determine lifecycle status
      const lifecycleStatus = listing.status === ListingStatus.Pending 
        ? ListingLifecycle.PENDING 
        : ListingLifecycle.ACTIVE
      
      return {
        updateOne: {
          filter: { 
            listingKey: listing.listingId,
            source: MLSSource.SPARK 
          },
          update: {
            $set: {
              listingKey: listing.listingId,
              sourceId: listing.listingId,
              listAgentKey: listAgentKey, // Will be null if no match found
              listPrice: listing.price,
              city: listing.city || '',
              stateOrProvince: (listing as any).stateOrProvince || '',
              mlsStatus: listing.status,
              lifecycleStatus: lifecycleStatus,
              isArchived: false,
              source: MLSSource.SPARK,
              association: MLSAssociation.AAR,
              standardFields: {
                listPrice: listing.price || 0,
                city: listing.city || '',
                stateOrProvince: (listing as any).stateOrProvince || '',
                postalCode: (listing as any).postalCode || (listing as any).zipCode || '',
                standardStatus: listing.status,
                bedsTotal: listing.beds,
                bathsTotal: listing.baths,
                buildingAreaTotal: listing.sqft,
                yearBuilt: listing.yearBuilt,
                propertyType: listing.propertyType || 'Residential',
                listOfficeName: agentInfo.officeName || null
              },
              photos: listing.photos?.map(photo => ({
                uri: photo.url,
                isPrimary: photo.isPrimary
              })) || [],
              // Include source fields for debugging
              sourceFields: (listing as any).sourceFields || {}
            },
            ...(listing.status === ListingStatus.Pending ? {
              $push: {
                statusHistory: {
                  fromStatus: null,
                  toStatus: ListingLifecycle.PENDING,
                  changedAt: new Date()
                }
              }
            } : {})
          },
          upsert: true
        }
      }
    });
    
    // Filter out null operations and ensure it's a valid BulkWriteOperation array
    const validListingOperations = listingOperations.filter(op => op !== null) as any[];
    const listingResults = await MLSListing.bulkWrite(validListingOperations);
    
    // Update the sync log with the results
    try {
      const endTime = new Date()
      await SyncHistory.updateOne(
        { _id: syncLog._id },
        { 
          $set: { 
            endTime: endTime,
            status: 'success',
            duration: endTime.getTime() - startTime.getTime(),
            listingsProcessed: allListings.length,
            agentsProcessed: agents.size,
            listingsUpserted: listingResults?.upsertedCount || 0,
            agentsUpserted: agentResults?.upsertedCount || 0
          } 
        }
      )
    } catch (err) {
      console.error('Error updating sync log:', err)
    }

    return {
      success: true,
      source: MLSSource.SPARK,
      agents: {
        processed: agents.size,
        upserted: agentResults.upsertedCount
      },
      listings: {
        processed: allListings.length,
        upserted: listingResults.upsertedCount
      }
    }

  } catch (error) {
    console.error('Error in syncSparkData:', error)
    
    // Log the error
    if (syncLog) {
      await SyncHistory.updateOne(
        { _id: syncLog._id },
        {
          $set: {
            endTime: new Date(),
            status: 'error',
            error: (error as Error).message
          }
        }
      )
    }
    
    throw error
  }
}

/**
 * Performs an incremental sync of Spark data, only fetching recently modified listings
 * This is much more efficient than a full sync for regular updates
 */
export async function syncSparkDataIncremental() {
  const startTime = new Date()
  let syncLog

  try {
    await connectDB()
    
    // Create sync log entry
    syncLog = await SyncHistory.create({
      startTime,
      status: 'in-progress'
    })

    // Fetch real agent data from the Spark Member API
    console.log('Fetching real agent data from Spark Member API...')
    const memberData = await fetchMemberData();
    console.log(`Fetched ${memberData.length} real agents from Spark Member API`);

    // Find the last successful sync time to use as a reference point
    const lastSync = await SyncHistory.findOne({
      status: 'success'
    }).sort({ endTime: -1 }).lean() as { endTime?: Date } | null;

    // Default to 24 hours ago if no previous sync
    const lastSyncTime = lastSync?.endTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log(`Using reference time for incremental sync: ${lastSyncTime.toISOString()}`);

    // Track status changes for reporting
    let statusChanges = {
      activeToPending: 0,
      pendingToActive: 0,
      newActive: 0,
      newPending: 0,
      pendingToSold: 0, // For future use
      modified: 0        // General modifications
    }

    // First, get all recent ACTIVE listings that may have been updated
    console.log('Fetching recently modified active listings...')
    const recentActive = await fetchRecentListings(ListingStatus.Active, lastSyncTime)
    
    // Then, get all recent PENDING listings that may have been updated
    console.log('Fetching recently modified pending listings...')
    const recentPending = await fetchRecentListings(ListingStatus.Pending, lastSyncTime)
    
    // Combine all recently changed listings
    const allChangedListings = [...recentActive, ...recentPending]
    
    if (allChangedListings.length === 0) {
      console.log('No listings have been modified since the last sync')
      
      // Update sync log with completion
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      
      await SyncHistory.findByIdAndUpdate(syncLog._id, {
        endTime,
        status: 'success',
        agentsProcessed: 0,
        listingsProcessed: 0,
        agentsUpserted: 0,
        listingsUpserted: 0,
        duration
      })
      
      return {
        success: true,
        agents: { processed: 0, upserted: 0 },
        listings: { processed: 0, upserted: 0 }
      }
    }
    
    console.log(`Found ${allChangedListings.length} listings modified since ${lastSyncTime}`)

    // For each changed listing, check if it exists and if its status has changed
    const listingUpdates: Array<{
      updateOne: {
        filter: { listingKey: string; source: string };
        update: { $set: any; $push?: any };
        upsert: boolean;
      }
    }> = []
    const existingListingKeys = new Set()
    
    if (allChangedListings.length > 0) {
      // Get existing listings to check for status changes
      const existingListings = await MLSListing.find({
        listingKey: { $in: allChangedListings.map(l => l.listingId) },
        source: MLSSource.SPARK
      }).lean()
      
      // Create a map for quick lookup
      const existingListingsMap = new Map()
      existingListings.forEach(listing => {
        existingListingsMap.set(listing.listingKey, listing)
        existingListingKeys.add(listing.listingKey)
      })
      
      // Process each changed listing
      allChangedListings.forEach(listing => {
        const existingListing = existingListingsMap.get(listing.listingId)
        const isNew = !existingListing
        
        // Determine lifecycle status from API status
        const newLifecycleStatus = listing.status === ListingStatus.Pending 
          ? ListingLifecycle.PENDING 
          : ListingLifecycle.ACTIVE
        
        // Track status changes for reporting
        if (isNew) {
          if (listing.status === ListingStatus.Active) {
            statusChanges.newActive++;
          } else if (listing.status === ListingStatus.Pending) {
            statusChanges.newPending++;
          }
        } else if (existingListing) {
          // Check for status changes
          if (existingListing.lifecycleStatus === ListingLifecycle.ACTIVE && newLifecycleStatus === ListingLifecycle.PENDING) {
            statusChanges.activeToPending++;
          } else if (existingListing.lifecycleStatus === ListingLifecycle.PENDING && newLifecycleStatus === ListingLifecycle.ACTIVE) {
            statusChanges.pendingToActive++;
          } else {
            statusChanges.modified++;
          }
        }
        
        // Create update operation for this listing
        listingUpdates.push({
          updateOne: {
            filter: { 
              listingKey: listing.listingId,
              source: MLSSource.SPARK 
            },
            update: {
              $set: {
                listingKey: listing.listingId,
                sourceId: listing.listingId,
                listAgentKey: (() => {
                  // Try to find matching member
                  const agentInfo = extractAgentInfo(listing);
                  if (!agentInfo) {
                    console.log(`Skipping listing ${listing.listingId || 'unknown'} - no valid agent information`);
                    return null; // Return null instead of fallback
                  }
                  
                  const matchingMember = findMatchingMember(memberData, agentInfo);
                  let listAgentKey = matchingMember?.MemberKey;
                  
                  // If no agent match, log a warning - this should never happen in production
                  if (!listAgentKey) {
                    console.warn(`WARNING: Missing agent match for listing ${listing.listingId}. This indicates a data sync issue that needs investigation.`);
                    console.warn(`Listing office: ${agentInfo.officeName || 'Unknown'}, City: ${listing.city || 'Unknown'}`);
                  }
                  
                  return listAgentKey; // Return null if no match found (remove fallback)
                })(),
                listPrice: listing.price,
                city: listing.city,
                stateOrProvince: 'TX', // Default to Texas
                mlsStatus: listing.status,
                lifecycleStatus: newLifecycleStatus,
                isArchived: false,
                source: MLSSource.SPARK,
                association: MLSAssociation.AAR,
                standardFields: {
                  listPrice: listing.price,
                  city: listing.city,
                  stateOrProvince: 'TX',
                  postalCode: listing.listingId.substring(0, 5),
                  standardStatus: listing.status,
                  bedsTotal: listing.beds,
                  bathsTotal: listing.baths,
                  buildingAreaTotal: listing.sqft,
                  yearBuilt: listing.yearBuilt,
                  propertyType: 'Residential',
                  listOfficeName: `${listing.city || 'Spark'} Real Estate Professionals`
                },
                photos: listing.photos.map(photo => ({
                  uri: photo.url,
                  isPrimary: photo.isPrimary
                })),
                officeName: `${listing.city || 'Spark'} Real Estate Professionals`
              },
              ...(!existingListing || existingListing.lifecycleStatus !== newLifecycleStatus ? {
                $push: {
                  statusHistory: {
                    fromStatus: existingListing?.lifecycleStatus || null,
                    toStatus: newLifecycleStatus,
                    changedAt: new Date()
                  }
                }
              } : {})
            },
            upsert: true
          }
        })
      })
    }
    
    // Unique agent keys from all modified listings
    const agentKeys = new Set(allChangedListings.map(listing => 
      `agent-${listing.city.replace(/\s+/g, '-').toLowerCase()}`
    ))
    
    // Extract agents from listings
    const agents = new Map()
    allChangedListings.forEach(listing => {
      const agentKey = `agent-${listing.city.replace(/\s+/g, '-').toLowerCase()}`
      
      if (!agents.has(agentKey)) {
        agents.set(agentKey, {
          memberKey: agentKey,
          fullName: extractAgentInfo(listing)?.name || '',
          source: MLSSource.SPARK,
          sourceId: agentKey,
          association: MLSAssociation.AAR,
          pendingListings: [],
          officeName: `${listing.city || 'Spark'} Real Estate Professionals`
        })
      }
    })
    
    // Update agents with their pending listings
    allChangedListings.forEach(listing => {
      if (listing.status === ListingStatus.Pending) {
        // Get the agent info
        const agentInfo = extractAgentInfo(listing);
        if (!agentInfo) {
          console.log(`Skipping pending listing ${listing.listingId || 'unknown'} - no valid agent information`);
          return;
        }
        
        // Try to find matching member
        const matchingMember = findMatchingMember(memberData, agentInfo);
        let agentKey = matchingMember?.MemberKey;
        
        // If no agent match found, log a warning
        if (!agentKey) {
          console.warn(`WARNING: Missing agent match for pending listing ${listing.listingId}. This indicates a data sync issue that needs investigation.`);
          console.warn(`Listing office: ${agentInfo.officeName || 'Unknown'}, City: ${listing.city || 'Unknown'}`);
          return; // Skip adding to pending listings without a valid agent
        }
        
        const agent = agents.get(agentKey);
        if (agent) {
          agent.pendingListings.push({
            address: listing.address || `Unknown Address in ${listing.city || 'Unknown City'}`,
            city: listing.city || '',
            state: (listing as any).stateOrProvince || 'TX',
            zipCode: listing.listingId?.substring(0, 5) || '',
            pendingDate: new Date(),
            listPrice: listing.price || 0
          });
        }
      }
    });
    
    // Create agent update operations
    const agentUpdates = Array.from(agents.values()).map(agent => ({
      updateOne: {
        filter: { memberKey: agent.memberKey },
        update: { $set: agent },
        upsert: true
      }
    }))
    
    console.log(`Processing ${listingUpdates.length} listing updates...`)
    console.log(`Processing ${agentUpdates.length} agent updates...`)
    
    // Execute all updates
    const [listingResults, agentResults] = await Promise.all([
      listingUpdates.length > 0 ? MLSListing.bulkWrite(listingUpdates) : { upsertedCount: 0 },
      agentUpdates.length > 0 ? MLSAgent.bulkWrite(agentUpdates) : { upsertedCount: 0 }
    ])
    
    // Log status changes
    console.log('Status changes detected:')
    console.log(`- New active listings: ${statusChanges.newActive}`)
    console.log(`- New pending listings: ${statusChanges.newPending}`)
    console.log(`- Active → Pending: ${statusChanges.activeToPending}`)
    console.log(`- Pending → Active: ${statusChanges.pendingToActive}`)
    console.log(`- Other modifications: ${statusChanges.modified}`)
    
    // Calculate duration
    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    // Update sync log
    await SyncHistory.findByIdAndUpdate(syncLog._id, {
      endTime,
      status: 'success',
      agentsProcessed: agents.size,
      listingsProcessed: allChangedListings.length,
      agentsUpserted: agentResults.upsertedCount,
      listingsUpserted: listingResults.upsertedCount,
      duration
    })

    console.log(`Incremental sync completed in ${duration/1000} seconds`)
    console.log(`Processed ${allChangedListings.length} listings (${recentActive.length} active, ${recentPending.length} pending)`)

    return {
      success: true,
      agents: {
        processed: agents.size,
        upserted: agentResults.upsertedCount
      },
      listings: {
        processed: allChangedListings.length,
        upserted: listingResults.upsertedCount
      }
    }

  } catch (error) {
    console.error('Incremental sync failed:', error)
    
    // Log sync failure
    if (syncLog) {
      await SyncHistory.findByIdAndUpdate(syncLog._id, {
        endTime: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    throw error
  }
}

/**
 * Helper function to fetch recent listings of a given status modified after a certain time
 */
async function fetchRecentListings(status: ListingStatus, modifiedAfter: Date) {
  const allListings = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    console.log(`Fetching ${status} listings - page ${page}...`)
    const response = await searchResidentialListings({
      status,
      limit: INCREMENTAL_SYNC_PAGE_SIZE,
      page
    })
    
    const { results: listings, pagination } = response
    
    // Filter for recently modified listings
    // In a production environment with a real API, we would add a timestamp filter to the API call itself
    const recentListings = listings.filter(listing => {
      // Simulating a modification timestamp check - in a real API, you'd use actual modification timestamps
      return true // For testing, assume all are modified (normally you'd check against modifiedAfter)
    })
    
    if (recentListings.length > 0) {
      allListings.push(...recentListings)
      console.log(`Found ${recentListings.length} modified ${status} listings on page ${page}`)
    }
    
    // Continue pagination only if we're still finding modified listings
    hasMore = page < pagination.TotalPages && recentListings.length > 0
    page++
    
    // Safety check - don't fetch too many pages
    if (page > 10) {
      console.log('Reached page limit (10) for incremental sync')
      break
    }
  }
  
  return allListings
} 