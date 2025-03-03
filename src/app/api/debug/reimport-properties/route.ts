import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { MLSListing, MLSSource, MLSAssociation } from '@/lib/models/mls'
import axios from 'axios'

const API_KEY = process.env.API_KEY || 'localdev'
const SPARK_API_URL = process.env.SPARK_API_URL || 'https://replication.sparkapi.com'
const SPARK_API_TOKEN = process.env.SPARK_API_TOKEN

interface SparkProperty {
  ListingKey: string
  ListAgentKey: string
  ListAgentFirstName: string
  ListAgentLastName: string
  ListAgentFullName: string
  ListAgentMlsId: string
  ListOfficeKey: string
  ListOfficeMlsId: string
  ListOfficeName: string
  ListingId: string
  UnparsedAddress: string
  City: string
  StateOrProvince: string
  PostalCode: string
  ListPrice: number
  StandardStatus: string
  MlsStatus: string
  PropertyType: string
  PropertySubType: string
  BedroomsTotal: number
  BathroomsTotalDecimal: number
  LivingArea: number
  LotSizeAcres: number
  LotSizeSquareFeet: number
  YearBuilt: number
  PublicRemarks: string
  ModificationTimestamp: string
  PhotosCount: number
  DocumentsCount: number
  VideosCount: number
  VirtualTourURLUnbranded: string
  OriginatingSystemID: string
}

export async function GET(request: Request) {
  try {
    // Authenticate the request
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (key !== API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      }, { status: 401 })
    }
    
    console.log('Starting property reimport...')
    await connectDB()
    
    // Drop all indexes except _id
    console.log('Dropping all indexes...')
    const indexes = await MLSListing.collection.indexes()
    for (const index of indexes) {
      if (index.name !== '_id_' && index.name) {
        try {
          await MLSListing.collection.dropIndex(index.name)
          console.log(`Dropped index ${index.name}`)
        } catch (error) {
          console.log(`Failed to drop index ${index.name}:`, error)
        }
      }
    }
    
    // Delete all existing listings
    console.log('Deleting existing listings...')
    await MLSListing.deleteMany({})
    console.log('Existing listings deleted')
    
    // Initialize Spark API client
    const sparkApi = axios.create({
      baseURL: SPARK_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata.metadata=minimal',
        'X-SparkApi-User-Agent': 'RoofLeadsPro/1.0',
        'Authorization': `Bearer ${SPARK_API_TOKEN}`
      }
    })
    
    // Check API connectivity
    try {
      await sparkApi.get('/Reso/OData/Property?$top=1')
      console.log('Successfully connected to Spark API')
    } catch (error: any) {
      console.error('Failed to connect to Spark API:', error.message)
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Spark API'
      }, { status: 500 })
    }
    
    // Get all properties in pages
    const pageSize = 100
    let currentPage = 0
    let hasMore = true
    let totalProcessed = 0
    let totalImported = 0
    let errors = []
    
    while (hasMore) {
      try {
        console.log(`Fetching page ${currentPage + 1}...`)
        const response = await sparkApi.get('/Reso/OData/Property', {
          params: {
            $top: pageSize,
            $skip: currentPage * pageSize
          }
        })
        
        const properties = response.data.value || []
        if (properties.length === 0) {
          hasMore = false
          break
        }
        
        // Process each property
        const listingsToInsert = properties.map((property: SparkProperty) => ({
          listingKey: property.ListingKey,
          listAgentKey: property.ListAgentKey,
          listAgentFirstName: property.ListAgentFirstName,
          listAgentLastName: property.ListAgentLastName,
          listAgentFullName: property.ListAgentFullName,
          listAgentMlsId: property.ListAgentMlsId,
          listOfficeKey: property.ListOfficeKey,
          listOfficeMlsId: property.ListOfficeMlsId,
          listOfficeName: property.ListOfficeName,
          listingId: property.ListingId,
          unparsedAddress: property.UnparsedAddress,
          city: property.City,
          stateOrProvince: property.StateOrProvince,
          postalCode: property.PostalCode,
          listPrice: property.ListPrice,
          standardStatus: property.StandardStatus,
          mlsStatus: property.MlsStatus,
          propertyType: property.PropertyType,
          propertySubType: property.PropertySubType,
          bedroomsTotal: property.BedroomsTotal,
          bathroomsTotalDecimal: property.BathroomsTotalDecimal,
          livingArea: property.LivingArea,
          lotSizeAcres: property.LotSizeAcres,
          lotSizeSquareFeet: property.LotSizeSquareFeet,
          yearBuilt: property.YearBuilt,
          publicRemarks: property.PublicRemarks,
          modificationTimestamp: property.ModificationTimestamp,
          photosCount: property.PhotosCount,
          documentsCount: property.DocumentsCount,
          videosCount: property.VideosCount,
          virtualTourURLUnbranded: property.VirtualTourURLUnbranded,
          source: MLSSource.SPARK,
          sourceId: property.ListingKey,
          association: MLSAssociation.AAR,
          standardFields: {
            listPrice: property.ListPrice,
            city: property.City,
            stateOrProvince: property.StateOrProvince,
            postalCode: property.PostalCode,
            standardStatus: property.StandardStatus,
            listOfficeName: property.ListOfficeName,
            bedsTotal: property.BedroomsTotal,
            bathsTotal: property.BathroomsTotalDecimal,
            buildingAreaTotal: property.LivingArea,
            yearBuilt: property.YearBuilt,
            propertyType: property.PropertyType,
            propertySubType: property.PropertySubType,
            publicRemarks: property.PublicRemarks,
            address: property.UnparsedAddress,
            streetNumberNumeric: property.UnparsedAddress?.split(' ')?.[0] || '',
            streetName: property.UnparsedAddress?.split(' ')?.slice(1)?.join(' ') || ''
          },
          sourceFields: {
            UnparsedAddress: property.UnparsedAddress,
            City: property.City,
            StateOrProvince: property.StateOrProvince,
            PostalCode: property.PostalCode,
            ListPrice: property.ListPrice,
            StandardStatus: property.StandardStatus,
            MlsStatus: property.MlsStatus,
            PropertyType: property.PropertyType,
            PropertySubType: property.PropertySubType,
            BedroomsTotal: property.BedroomsTotal,
            BathroomsTotalDecimal: property.BathroomsTotalDecimal,
            LivingArea: property.LivingArea,
            LotSizeAcres: property.LotSizeAcres,
            LotSizeSquareFeet: property.LotSizeSquareFeet,
            YearBuilt: property.YearBuilt,
            PublicRemarks: property.PublicRemarks,
            ModificationTimestamp: property.ModificationTimestamp
          }
        }))
        
        // Insert listings in bulk
        if (listingsToInsert.length > 0) {
          await MLSListing.insertMany(listingsToInsert)
          totalImported += listingsToInsert.length
        }
        
        totalProcessed += properties.length
        currentPage++
        
        // Log progress
        console.log(`Processed ${totalProcessed} properties, imported ${totalImported} listings`)
        
      } catch (error: any) {
        console.error(`Error fetching page ${currentPage + 1}:`, error.message)
        errors.push(`Error fetching page ${currentPage + 1}: ${error.message}`)
        hasMore = false
      }
    }
    
    // Recreate the compound index
    console.log('Recreating compound index...')
    await MLSListing.collection.createIndex({ source: 1, sourceId: 1 }, { unique: true })
    console.log('Compound index recreated')
    
    return NextResponse.json({
      success: true,
      stats: {
        totalProcessed,
        totalImported,
        errors: errors.length > 0 ? errors : undefined
      }
    })
    
  } catch (error: any) {
    console.error('Error reimporting properties:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred while reimporting properties'
    }, { status: 500 })
  }
} 