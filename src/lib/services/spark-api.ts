import axios, { AxiosInstance } from 'axios'

const SPARK_API_URL = process.env.SPARK_API_URL || 'https://replication.sparkapi.com'
const SPARK_API_TOKEN = process.env.SPARK_API_TOKEN || '3tk5g91q5f96npri34ilsb6a5'

export interface SparkAgent {
  MemberKey: string
  MemberMlsId: string
  MemberFirstName: string
  MemberLastName: string
  MemberFullName?: string
  MemberEmail: string
  MemberPreferredPhone: string
  OfficeName: string
  ModificationTimestamp: string
  // Add other properties as needed
}

export class SparkAPI {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: SPARK_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-SparkApi-User-Agent': 'RoofLeadsPro/1.0',
        'Authorization': `Bearer ${SPARK_API_TOKEN}`
      }
    })
  }

  async authenticate(): Promise<void> {
    // No need to authenticate separately as we're using a bearer token
    console.log('Using Spark API token:', SPARK_API_TOKEN ? '****' + SPARK_API_TOKEN.slice(-4) : 'NOT SET')
    
    if (!SPARK_API_TOKEN) {
      throw new Error('SPARK_API_TOKEN not configured')
    }
    
    // Test connection by getting system info
    try {
      const response = await this.client.get('/v1/system')
      console.log('Spark API connection successful:', response.data?.D?.Results[0]?.Name)
    } catch (error) {
      console.error('Failed to connect to Spark API:', error)
      throw new Error('Connection to Spark API failed')
    }
  }

  async getMemberByKey(memberKey: string): Promise<SparkAgent | null> {
    try {
      const response = await this.client.get(`/v1/members/${memberKey}`)
      
      if (response.data && response.data.D && response.data.D.Results && response.data.D.Results.length > 0) {
        return response.data.D.Results[0] as SparkAgent
      }
      
      return null
    } catch (error) {
      console.error(`Error fetching member with key ${memberKey}:`, error)
      return null
    }
  }
} 