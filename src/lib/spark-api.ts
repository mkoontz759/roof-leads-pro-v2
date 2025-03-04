import axios from 'axios'

const SPARK_API_TOKEN = process.env.SPARK_API_TOKEN
const SPARK_API_URL = process.env.SPARK_API_URL || 'https://replication.sparkapi.com'

// Add debugging
console.log('Spark API Configuration:', {
  token: SPARK_API_TOKEN ? '****' + SPARK_API_TOKEN.slice(-4) : 'NOT SET',
  url: SPARK_API_URL
})

// Add more specific types based on the response we got
interface StandardFields {
  City: string
  ListPrice: number
  ListingId: string
  MlsId: string
  ModificationTimestamp: string
  PostalCode: string
  StandardStatus: string
  StateOrProvince: string
  ListOfficeName: string
  ListingUpdateTimestamp: string
  BedsTotal?: number
  BathsTotal?: number
  BuildingAreaTotal?: number
  LotSizeArea?: number
  PropertyType?: string
  PropertySubType?: string
  YearBuilt?: number
  PublicRemarks?: string
  Photos?: Array<{
    Uri: string
    Uri300: string
    Uri640: string
    Uri800: string
    Uri1024: string
    Uri1280: string
    Uri1600: string
    Uri2048: string
    UriLarge: string
    UriThumb: string
    Name: string
    Caption: string
    Primary: boolean
  }>
}

interface SparkListingResponse {
  D: {
    Success: boolean
    Results: Array<{
      ResourceUri: string
      Id: string
      StandardFields: StandardFields
      CustomFields?: Record<string, unknown>
    }>
    Pagination: {
      TotalRows: number
      PageSize: number
      TotalPages: number
      CurrentPage: number
    }
  }
}

export const sparkApi = axios.create({
  baseURL: SPARK_API_URL,
  headers: {
    'Authorization': `Bearer ${SPARK_API_TOKEN}`,
    'Accept': 'application/json',
    'X-SparkApi-User-Agent': 'RoofLeadsPro/1.0'
  }
})

export async function testSparkApi() {
  try {
    console.log('\nFetching listings...')
    const response = await sparkApi.get('/v1/listings', {
      params: {
        _limit: 1
      }
    })

    if (response.data?.D?.Success) {
      return {
        success: true,
        data: response.data
      }
    }

    throw new Error('API response indicates failure')
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// Update the PropertyType enum based on what we found
export enum PropertyType {
  Residential = 'A',  // 'A' appears to be residential
  MultiFamily = 'B',  // 'B' might be multi-family
  Lots = 'D',        // 'D' might be lots/land
  Commercial = 'E'   // 'E' appears to be commercial
}

// Helper function to search listings with more options
export async function searchListings(params: {
  _limit?: number
  _page?: number
  _select?: string
  _filter?: string
  _orderby?: string
  city?: string
  minPrice?: number
  maxPrice?: number
  status?: string
  sortBy?: 'price' | 'date'
  sortDir?: 'asc' | 'desc'
  minBeds?: number
  maxBeds?: number
  propertyType?: PropertyType  // Updated to use enum
}) {
  try {
    const { 
      city, 
      minPrice, 
      maxPrice, 
      status, 
      sortBy, 
      sortDir,
      minBeds,
      maxBeds,
      propertyType,
      _page,
      _limit,
      ...restParams 
    } = params
    
    const filters: string[] = []

    // Build filters
    if (city) {
      filters.push(`City eq '${city}'`)
    }
    if (minPrice) {
      filters.push(`ListPrice ge ${minPrice}`)
    }
    if (maxPrice) {
      filters.push(`ListPrice le ${maxPrice}`)
    }
    if (status) {
      filters.push(`StandardStatus eq '${status}'`)
    }
    if (minBeds) {
      filters.push(`BedsTotal ge ${minBeds}`)
    }
    if (maxBeds) {
      filters.push(`BedsTotal le ${maxBeds}`)
    }
    if (propertyType) {
      filters.push(`PropertyType eq '${propertyType}'`)
    }

    // Build sort order
    let orderBy: string | undefined
    if (sortBy === 'price') {
      orderBy = `ListPrice ${sortDir || 'asc'}`
    } else if (sortBy === 'date') {
      orderBy = `ListingUpdateTimestamp ${sortDir || 'desc'}`
    }

    const queryParams = {
      ...restParams,
      _select: [
        'ListingId',
        'ListPrice',
        'City',
        'StateOrProvince',
        'PostalCode',
        'StandardStatus',
        'ListOfficeName',
        'ModificationTimestamp',
        'ListingUpdateTimestamp',
        'MlsId',
        'BedsTotal',
        'BathsTotal',
        'BuildingAreaTotal',
        'LotSizeArea',
        'PropertyType',
        'PropertySubType',
        'YearBuilt',
        'PublicRemarks',
        'Photos'
      ].join(','),
      _filter: filters.length > 0 ? filters.join(' and ') : undefined,
      _orderby: orderBy,
      _pagination: 1, // Enable pagination
      _page: _page || 1, // Pass page number (default to 1)
      _limit: _limit || 50, // Pass limit (default to 50)
    }

    console.log('Search params:', queryParams)

    const response = await sparkApi.get<SparkListingResponse>('/v1/listings', { 
      params: queryParams 
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Search Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        params: error.config?.params,
        url: error.config?.url
      })
    }
    throw error
  }
}

// Helper function to get listing details
export async function getListingDetails(listingId: string) {
  try {
    const response = await sparkApi.get<SparkListingResponse>(`/v1/listings/${listingId}`)
    return response.data
  } catch (error) {
    console.error('Failed to get listing details:', error)
    throw error
  }
}

// Add these helper types and functions
export enum ListingStatus {
  Active = 'Active',
  Pending = 'Pending',
  Sold = 'Sold',
  Expired = 'Expired',
  Withdrawn = 'Withdrawn'
}

export interface ListingSummary {
  id: string
  listingId: string
  price: number
  city: string
  beds: number
  baths: number
  sqft: number
  yearBuilt: number
  propertyType: PropertyType
  status: ListingStatus
  address?: string
  photos: Array<{
    url: string
    isPrimary: boolean
  }>
}

// Helper function to convert API response to ListingSummary
export function convertToListingSummary(result: SparkListingResponse['D']['Results'][0]): ListingSummary {
  const fields = result.StandardFields
  
  return {
    id: result.Id,
    listingId: fields.ListingId,
    price: fields.ListPrice,
    city: fields.City,
    beds: fields.BedsTotal || 0,
    baths: fields.BathsTotal || 0,
    sqft: fields.BuildingAreaTotal || 0,
    yearBuilt: fields.YearBuilt || 0,
    propertyType: fields.PropertyType as PropertyType,
    status: fields.StandardStatus as ListingStatus,
    photos: (fields.Photos || []).map(photo => ({
      url: photo.Uri800 || photo.Uri640 || photo.Uri300,
      isPrimary: photo.Primary
    }))
  }
}

// Updated search function with better typing
export async function searchResidentialListings(params: {
  city?: string
  minPrice?: number
  maxPrice?: number
  status?: ListingStatus
  minBeds?: number
  maxBeds?: number
  page?: number
  limit?: number
  sortBy?: 'price' | 'date'
  sortDir?: 'asc' | 'desc'
}) {
  const response = await searchListings({
    ...params,
    propertyType: PropertyType.Residential,
    _page: params.page,
    _limit: params.limit
  })

  return {
    results: response.D.Results.map(convertToListingSummary),
    pagination: response.D.Pagination
  }
} 