export interface MLSTransaction {
  ListingKey: string
  ListPrice: number
  ListAgentKey: string
  StandardStatus: string
  ModificationTimestamp: string
  ListDate: string
  StreetNumberNumeric?: string
  StreetName: string
  City: string
  StateOrProvince: string
  PostalCode: string
  Bathrooms?: number
  Bedrooms?: number
  LivingArea?: number
  YearBuilt?: number
  PropertyType?: string
  PropertySubType?: string
  PendingTimestamp?: string
  CloseDate?: string
  TaxAnnualAmount?: number
}

export interface MLSAgent {
  MemberKey: string
  MemberFirstName: string
  MemberLastName: string
  MemberEmail?: string
  PreferredPhone?: string
  OfficeName?: string
} 