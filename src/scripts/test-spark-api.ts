import { testSparkApi, searchResidentialListings, ListingStatus } from '../lib/spark-api'
import * as dotenv from 'dotenv'
import axios from 'axios'

// Load environment variables
dotenv.config()

async function exploreApi() {
  try {
    console.log('1. Testing API Connection...')
    console.log('Endpoint:', process.env.SPARK_API_URL || 'https://replication.sparkapi.com')
    console.log('Token:', process.env.SPARK_API_TOKEN ? '****' + process.env.SPARK_API_TOKEN.slice(-4) : 'Not set')

    console.log('\n2. Testing Basic Listings Query...')
    const data = await testSparkApi()
    
    if (data.listings?.D?.Results?.[0]) {
      console.log('\nSample Listing:')
      const listing = data.listings.D.Results[0]
      console.log(JSON.stringify(listing.StandardFields, null, 2))

      console.log('\n3. Testing Residential Search...')
      const searchResults = await searchResidentialListings({
        minPrice: 200000,
        maxPrice: 500000,
        status: ListingStatus.Active,
        minBeds: 3,
        sortBy: 'price',
        sortDir: 'asc',
        limit: 10,
        page: 1
      })
      
      if (searchResults.results.length > 0) {
        console.log('\nResults Summary:')
        console.table(searchResults.results.map(r => ({
          price: r.price,
          city: r.city,
          beds: r.beds,
          baths: r.baths,
          sqft: r.sqft,
          yearBuilt: r.yearBuilt,
          status: r.status,
          photos: r.photos.length
        })))

        console.log('\nPagination Info:')
        console.log(JSON.stringify(searchResults.pagination, null, 2))
      }
    }

  } catch (error: unknown) {
    console.error('Test failed:', error)
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data)
      console.error('Status:', error.response?.status)
      console.error('Headers:', error.response?.headers)
    }
  }
}

exploreApi() 