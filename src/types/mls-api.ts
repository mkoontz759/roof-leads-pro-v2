export interface MLSAgent {
  MemberKey: string
  FirstName: string
  LastName: string
  Email: string | null
  MobilePhone: string | null
  OfficePhone: string | null
  OfficeName: string | null
  MemberStatus: string
}

export interface MLSListing {
  ListingKey: string
  StandardStatus: string
  ListPrice: number
  StreetAddress: string
  City: string
  StateOrProvince: string
  PostalCode: string
  ListDate: string
  ListAgentKey: string
  ModificationTimestamp: string
}

export interface MLSResponse<T> {
  value: T[]
  '@odata.context'?: string
  '@odata.count'?: number
} 