export const PROPERTY_FIELDS = {
  // Core fields that we need to store
  CORE: {
    ListingKey: { type: 'string', description: 'Unique identifier for the listing' },
    ListPrice: { type: 'number', description: 'Price of the listing' },
    ListAgentKey: { type: 'string', description: 'Agent identifier' },
    StandardStatus: { type: 'string', description: 'Current status (Active, Pending, etc)' },
    ModificationTimestamp: { type: 'string', description: 'Last update time' },
    ListDate: { type: 'string', description: 'Original list date' },
    
    // Address fields
    StreetNumberNumeric: { type: 'string', description: 'Street number' },
    StreetName: { type: 'string', description: 'Street name' },
    City: { type: 'string', description: 'City name' },
    StateOrProvince: { type: 'string', description: 'State' },
    PostalCode: { type: 'string', description: 'ZIP code' }
  },

  // Additional fields we might want to add to our schema
  RECOMMENDED: {
    // Property details
    Bathrooms: { type: 'number', description: 'Number of bathrooms' },
    Bedrooms: { type: 'number', description: 'Number of bedrooms' },
    LivingArea: { type: 'number', description: 'Square footage' },
    YearBuilt: { type: 'number', description: 'Year the property was built' },
    PropertyType: { type: 'string', description: 'Type of property' },
    PropertySubType: { type: 'string', description: 'Sub-type of property' },
    
    // Additional dates
    PendingTimestamp: { type: 'string', description: 'When the property went pending' },
    CloseDate: { type: 'string', description: 'Closing date if sold' },
    
    // Price related
    TaxAnnualAmount: { type: 'number', description: 'Annual tax amount' }
  }
}

export const AGENT_FIELDS = {
  CORE: {
    MemberKey: { type: 'string', description: 'Unique identifier for the agent' },
    MemberFirstName: { type: 'string', description: 'First name' },
    MemberLastName: { type: 'string', description: 'Last name' },
    MemberEmail: { type: 'string', description: 'Email address' },
    PreferredPhone: { type: 'string', description: 'Primary contact number' },
    OfficeName: { type: 'string', description: 'Real estate office name' }
  }
} 