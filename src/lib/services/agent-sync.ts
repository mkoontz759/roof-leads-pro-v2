import { MLSAgent } from '@/lib/models/mls'
import { getMLSToken } from '@/lib/mls-auth'
import axios from 'axios'
import { updateSyncStatus } from './sync-status'
import { MLSListing } from '@/lib/models/mls'

const MLS_API_URL = 'https://retsapi.raprets.com/2/LUBB/RESO/OData'

interface MLSMember {
  MemberKey: string
  MemberKeyNumeric: number
  MemberMlsId: string
  MemberFirstName: string
  MemberLastName: string
  MemberFullName: string
  MemberEmail: string
  OfficeName: string
  PreferredPhone: string
  ModificationTimestamp: string
}

export async function syncAgents() {
  try {
    // Update sync status
    await updateSyncStatus({
      isActive: true,
      type: 'full',
      target: 'agents',
      progress: 0,
      startTime: new Date().toISOString(),
      agentsProcessed: 0
    })

    const token = await getMLSToken()
    
    // Fetch all active agents
    const response = await axios.get<{ value: MLSMember[] }>(`${MLS_API_URL}/ActiveAgents`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    const members = response.data.value
    
    // Filter valid members
    const validMembers = members.filter(member => 
      member.MemberMlsId?.match(/^\d{9}$/) &&
      !['raptrain1', 'raptrain', 'raptest'].includes(member.MemberMlsId) &&
      member.MemberKeyNumeric > 0
    )

    // Track changes
    let created = 0
    let updated = 0
    let unchanged = 0
    let agentChanges: Array<{ mlsId: string, changes: string[] }> = []

    // Process each valid member
    for (const member of validMembers) {
      // Find existing agent by MLS ID
      const existingAgent = await MLSAgent.findOne({ memberMlsId: member.MemberMlsId })

      if (!existingAgent) {
        // Create new agent
        await MLSAgent.create({
          memberKey: member.MemberKey,
          memberKeyNumeric: member.MemberKeyNumeric,
          memberMlsId: member.MemberMlsId,
          firstName: member.MemberFirstName,
          lastName: member.MemberLastName,
          fullName: member.MemberFullName,
          email: member.MemberEmail,
          officeName: member.OfficeName,
          phone: member.PreferredPhone,
          modificationTimestamp: new Date(member.ModificationTimestamp),
          updatedAt: new Date()
        })
        created++
      } else {
        // Check for changes
        const changes: string[] = []
        if (existingAgent.officeName !== member.OfficeName) changes.push('office')
        if (existingAgent.phone !== member.PreferredPhone) changes.push('phone')
        if (existingAgent.email !== member.MemberEmail) changes.push('email')
        if (existingAgent.fullName !== member.MemberFullName) changes.push('name')

        if (changes.length > 0) {
          // Update agent with changes
          await MLSAgent.updateOne(
            { memberMlsId: member.MemberMlsId },
            {
              $set: {
                officeName: member.OfficeName,
                phone: member.PreferredPhone,
                email: member.MemberEmail,
                firstName: member.MemberFirstName,
                lastName: member.MemberLastName,
                fullName: member.MemberFullName,
                modificationTimestamp: new Date(member.ModificationTimestamp),
                updatedAt: new Date()
              }
            }
          )
          updated++
          agentChanges.push({ mlsId: member.MemberMlsId, changes })
        } else {
          unchanged++
        }
      }

      // Update progress
      await updateSyncStatus({
        progress: Math.round(((created + updated + unchanged) / validMembers.length) * 100),
        agentsProcessed: created + updated + unchanged
      })

      // In the syncAgents function, add pending listings tracking
      const pendingListings = await MLSListing.find({
        listAgentKey: member.MemberKey,
        mlsStatus: 'Under Contract'
      }).sort({ modificationTimestamp: -1 })

      const formattedListings = pendingListings.map(listing => ({
        address: listing.streetNumberNumeric + ' ' + listing.streetName,
        city: listing.city,
        state: listing.stateOrProvince,
        zipCode: listing.postalCode,
        pendingDate: new Date(listing.modificationTimestamp),
        listPrice: listing.listPrice
      }))

      // Add to the agent update/create
      await MLSAgent.updateOne(
        { memberMlsId: member.MemberMlsId },
        {
          $set: {
            // ... other fields ...
            pendingListings: formattedListings
          }
        }
      )
    }

    // Complete sync
    await updateSyncStatus({
      isActive: false,
      progress: 100,
      endTime: new Date().toISOString(),
      agentsProcessed: created + updated + unchanged
    })

    return {
      success: true,
      total: validMembers.length,
      created,
      updated,
      unchanged,
      changes: agentChanges
    }

  } catch (error) {
    await updateSyncStatus({
      isActive: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      endTime: new Date().toISOString()
    })
    throw error
  }
} 