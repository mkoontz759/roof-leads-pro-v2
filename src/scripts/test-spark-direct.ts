import axios from 'axios'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testSparkDirect() {
  const token = process.env.SPARK_API_TOKEN || '3tk5g91q5f96npri34ilsb6a5'
  const url = 'https://replication.sparkapi.com/v1/listings'

  console.log('Testing with:', {
    token: '****' + token.slice(-4),
    url
  })

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'X-SparkApi-User-Agent': 'RoofLeadsPro/1.0'
      },
      params: {
        _limit: 1
      }
    })

    console.log('Success:', {
      status: response.status,
      data: response.data
    })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
    } else {
      console.error('Unknown error:', error)
    }
  }
}

testSparkDirect() 