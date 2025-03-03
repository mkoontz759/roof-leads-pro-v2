import axios from 'axios'
import qs from 'querystring'

const MLS_AUTH_URL = 'https://retsidentityapi.raprets.com/LUBB/oauth/token'
const MLS_API_URL = 'https://retsapi.raprets.com/2/LUBB/RESO/OData'

export interface MLSListing {
  ListingKey: string
  ListPrice: number
  ListAgentKey: string
  StreetNumberNumeric?: string
  StreetName?: string
  City: string
  StateOrProvince: string
  PostalCode: string
  ModificationTimestamp: string
  MlsStatus: string
  ContractStatusChangeDate: string
  ListingContractDate: string
}

export interface MLSAgent {
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

export interface MLSField {
  EntityName: string
  StandardName: string
  DataType: string
  Required: boolean
  Searchable: boolean
  MaxLength?: number
}

export async function getMLSToken() {
  try {
    console.log('Getting auth token...')
    const tokenUrl = 'https://retsidentityapi.raprets.com/LUBB/oauth/token'
    
    const data = qs.stringify({
      grant_type: 'password',
      client_id: process.env.MLS_CLIENT_ID,
      client_secret: process.env.MLS_CLIENT_SECRET,
      username: process.env.MLS_USERNAME,
      password: process.env.MLS_PASSWORD
    })

    const response = await axios.post(tokenUrl, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.data.access_token) {
      throw new Error('No access token in response')
    }

    return response.data.access_token
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('MLS credentials rejected')
      throw new Error('MLS authentication failed')
    }
    console.error('Failed to get MLS token:', error)
    throw error
  }
}

export async function getAvailableFields(token: string, entityName: 'Property' | 'ActiveAgents' | 'Member') {
  try {
    console.log(`Fetching fields for ${entityName}...`)
    
    // First, get a sample record to see its structure
    const response = await axios.get(`${MLS_API_URL}/${entityName}`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        '$top': '1'
      }
    })

    console.log('Sample record:', JSON.stringify(response.data.value[0], null, 2))

    // Extract field information from the sample record
    const fields = Object.keys(response.data.value[0]).map(key => ({
      EntityName: entityName,
      StandardName: key,
      DataType: typeof response.data.value[0][key],
      Required: response.data.value[0][key] !== null,
      Searchable: true // Assume all fields are searchable for now
    }))

    return fields
  } catch (error) {
    console.error(`Error fetching fields for ${entityName}:`, error)
    throw error
  }
}

export interface PaginationOptions {
  pageSize: 12 | 24 | 60
  page: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface DataSystemResponse {
  Resources: {
    Name: string
    ResourcePath: string
    Localization: {
      Name: string
      ResourcePath: string
      Description: string
    }[]
  }[]
}

export async function getPropertyClasses(token: string) {
  try {
    const response = await axios.get<DataSystemResponse>(`${MLS_API_URL}/DataSystem`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    const propertyResource = response.data.Resources.find(r => r.Name === 'Property')
    return propertyResource?.Localization || []
  } catch (error) {
    console.error('Failed to get property classes:', error)
    throw error
  }
}

export async function getNewPendingContracts(token: string): Promise<{listings: MLSListing[], agents: MLSAgent[]}> {
  try {
    const allListings: MLSListing[] = []
    let url = `${MLS_API_URL}/Property`
    
    // Keep fetching until we have all listings
    while (url) {
      const pendingResponse = await axios.get(url, {
        headers: {
          'Authorization': `bearer ${token}`,
          'Accept': 'application/json'
        },
        params: url === `${MLS_API_URL}/Property` ? {
          'class': 'Residential',
          '$filter': "MlsStatus eq 'Active' or MlsStatus eq 'Under Contract'",
          '$select': [
            'ListingKey',
            'ListPrice',
            'ListAgentKey',
            'StreetNumberNumeric',
            'StreetName',
            'City',
            'StateOrProvince',
            'PostalCode',
            'ModificationTimestamp',
            'MlsStatus',
            'ContractStatusChangeDate',
            'ListingContractDate'
          ].join(','),
          '$orderby': 'ModificationTimestamp desc',
          '$count': true
        } : undefined // Don't include params for nextLink URLs
      })

      allListings.push(...pendingResponse.data.value)
      console.log(`Fetched ${allListings.length} listings of ${pendingResponse.data['@odata.count']} total`)
      
      // Get the next page URL if it exists
      url = pendingResponse.data['@odata.nextLink'] || ''
    }

    // Get all agents
    const agentsResponse = await axios.get(`${MLS_API_URL}/ActiveAgents`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        '$select': [
          'MemberKey',
          'MemberKeyNumeric',
          'MemberMlsId',
          'MemberFirstName',
          'MemberLastName',
          'MemberFullName',
          'MemberEmail',
          'OfficeName',
          'PreferredPhone',
          'ModificationTimestamp',
          'MemberStateLicense',
          'OfficeMlsId',
          'OfficeKeyNumeric'
        ].join(',')
      }
    })

    return {
      listings: allListings,
      agents: agentsResponse.data.value
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to get pending contracts:', error.message)
    }
    throw error
  }
}

export async function getMetadata(token: string) {
  const response = await axios.get(MLS_API_URL, {
    headers: {
      'Authorization': `bearer ${token}`,
      'Accept': 'application/json'
    }
  })
  return response.data
}

export async function testMLSAccess(token: string) {
  try {
    const response = await axios.get(`${MLS_API_URL}/Property`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        '$top': '1'
      }
    })

    return response.data
  } catch (error) {
    console.error('API Test Error:', error)
    throw error
  }
}

// Add interface for status changes
interface MLSStatusChange {
  ListingKey: string
  OldStatus: string
  NewStatus: string
  ChangeDate: string
  ListPrice: number
  ListAgentKey: string
}

// Add function to detect status changes
export async function detectStatusChanges(oldListings: MLSListing[], newListings: MLSListing[]): Promise<MLSStatusChange[]> {
  const changes: MLSStatusChange[] = []
  
  // Create map of old listings by key
  const oldListingsMap = new Map(oldListings.map(l => [l.ListingKey, l]))
  
  // Check each new listing for status changes
  for (const newListing of newListings) {
    const oldListing = oldListingsMap.get(newListing.ListingKey)
    if (oldListing && oldListing.MlsStatus !== newListing.MlsStatus) {
      changes.push({
        ListingKey: newListing.ListingKey,
        OldStatus: oldListing.MlsStatus,
        NewStatus: newListing.MlsStatus,
        ChangeDate: newListing.ContractStatusChangeDate || newListing.ModificationTimestamp,
        ListPrice: newListing.ListPrice,
        ListAgentKey: newListing.ListAgentKey
      })
    }
  }
  
  return changes
} 