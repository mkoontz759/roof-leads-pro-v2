import axios from 'axios'
import qs from 'querystring'
import { MLSListing, MLSAgent } from '../mls-auth'

export class MLSService {
  private apiUrl: string
  private authUrl: string
  private clientId: string
  private clientSecret: string
  private username: string
  private password: string
  private authToken: string | null
  private tokenExpires: Date | null

  constructor() {
    this.apiUrl = 'https://retsapi.raprets.com/2/lab_lbk/RESO/OData'
    this.authUrl = 'https://retsidentityapi.raprets.com/lab_lbk/oauth/token'
    this.clientId = 'lab_lbk'
    this.clientSecret = 'c611edc190444c2ab90abce0b8703b83'
    this.username = 'lablbk'
    this.password = 'lubbapill'
    this.authToken = null
    this.tokenExpires = null
  }

  async authenticate() {
    try {
      console.log('Authenticating with MLS...')

      const data = qs.stringify({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: this.password
      })

      const response = await axios.post(this.authUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      this.authToken = response.data.access_token
      this.tokenExpires = new Date(response.data['.expires'])

      console.log('Successfully authenticated with MLS')
      return this.authToken

    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    }
  }

  async getNewPendingContracts() {
    try {
      if (!this.authToken || new Date() >= this.tokenExpires!) {
        await this.authenticate()
      }

      // 1. Get pending transactions
      console.log('Fetching pending transactions...')
      const pendingResponse = await axios.get(`${this.apiUrl}/Property`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        },
        params: {
          '$filter': "MlsStatus eq 'Under Contract'",
          '$select': 'ListingKey,ListPrice,ListAgentKey,StreetNumberNumeric,StreetName,City,StateOrProvince,PostalCode,ModificationTimestamp',
          '$top': '1000',
          '$orderby': 'ModificationTimestamp desc',
          'class': 'Residential'
        }
      })

      const pendingListings = pendingResponse.data.value.map((listing: any) => ({
        listingKey: listing.ListingKey,
        listPrice: listing.ListPrice,
        listAgentKey: listing.ListAgentKey,
        address: {
          street: `${listing.StreetNumberNumeric || ''} ${listing.StreetName || ''}`.trim(),
          city: listing.City,
          state: listing.StateOrProvince,
          zip: listing.PostalCode
        },
        modificationTimestamp: listing.ModificationTimestamp
      }))

      // 2. Get active agents
      console.log('Fetching all active agents...')
      const agentsResponse = await axios.get(`${this.apiUrl}/Member`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        }
      })

      const agents = agentsResponse.data.value.map((agent: any) => ({
        memberKey: agent.MemberKey,
        firstName: agent.MemberFirstName,
        lastName: agent.MemberLastName,
        fullName: agent.MemberFullName,
        email: agent.MemberEmail,
        mlsId: agent.MemberMlsId,
        officeName: agent.OfficeName,
        phone: agent.PreferredPhone,
        lastUpdated: agent.ModificationTimestamp
      }))

      return {
        listings: pendingListings,
        agents: agents
      }

    } catch (error) {
      console.error('Error in getNewPendingContracts:', error)
      throw error
    }
  }
}

export function filterActiveListings(listings: MLSListing[]): MLSListing[] {
  return listings.filter(l => l.MlsStatus === 'Active')
}

export function filterUnderContractListings(listings: MLSListing[]): MLSListing[] {
  return listings.filter(l => l.MlsStatus === 'Under Contract')
}

export function getRecentStatusChanges(listings: MLSListing[]): MLSListing[] {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return listings.filter(l => {
    const modDate = new Date(l.ModificationTimestamp)
    return modDate > twentyFourHoursAgo
  })
}

export function findAgentByKey(agents: MLSAgent[], agentKey: string): MLSAgent | undefined {
  return agents.find(a => a.MemberKey === agentKey)
}

export function getListingsForAgent(listings: MLSListing[], agentKey: string): MLSListing[] {
  return listings.filter(l => l.ListAgentKey === agentKey)
} 