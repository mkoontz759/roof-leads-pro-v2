import mongoose, { Document } from 'mongoose'

// Add an enum for listing lifecycle status
export enum ListingLifecycle {
  ACTIVE = "Active",
  PENDING = "Active Under Contract",
  CLOSED = "Closed",
  EXPIRED = "Expired",
  WITHDRAWN = "Withdrawn",
  CANCELED = "Canceled"
}

// Add enum for MLS source
export enum MLSSource {
  SPARK = 'spark',            // Amarillo MLS via Spark API
  RAPATTONI = 'rapattoni',    // LUBB MLS via Rapattoni
  // Add more sources as needed
}

export enum MLSAssociation {
  AAR = 'aar',                // Amarillo Association of Realtors
  LAR = 'lar',                // Lubbock Association of Realtors
  NTREIS = 'ntreis',          // North Texas Real Estate Information Systems
  // Add more as needed
}

interface MLSAgentDocument extends Document {
  memberKey: string
  memberKeyNumeric?: number
  memberMlsId?: string
  fullName: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  officeName?: string
  modificationTimestamp?: Date
  updatedAt: Date
  pendingListings: PendingListing[]
  source: MLSSource // Source identifier
  sourceId: string  // Original ID in the source system
  association: MLSAssociation // Real estate association source
}

interface MLSListingDocument extends Document {
  listingKey: string
  listAgentKey: string
  mlsStatus?: string
  lifecycleStatus: ListingLifecycle
  statusHistory: {
    fromStatus?: string
    toStatus?: string
    changedAt?: Date
  }[]
  isArchived: boolean
  streetNumberNumeric?: string
  streetName?: string
  city?: string
  stateOrProvince?: string
  listPrice?: number
  _original?: { mlsStatus?: string }
  source: MLSSource // Source identifier
  sourceId: string  // Original ID in the source system
  association: MLSAssociation // Real estate association source
  
  // Standardized fields across all MLS sources
  standardFields: {
    listPrice: number
    city: string
    stateOrProvince: string
    postalCode: string
    standardStatus: string
    listOfficeName: string
    bedsTotal?: number
    bathsTotal?: number
    buildingAreaTotal?: number
    yearBuilt?: number
    propertyType?: string
    propertySubType?: string
    publicRemarks?: string
  }
  
  // Source-specific fields (keep native structure)
  sourceFields?: Record<string, any>
  
  photos?: Array<{
    uri: string
    isPrimary: boolean
  }>
}

// Add interface for pending listings
interface PendingListing {
  address: string
  city: string
  state: string
  zipCode: string
  pendingDate: Date
  listPrice: number
}

const mlsAgentSchema = new mongoose.Schema({
  memberKey: { type: String, required: true, unique: true },
  memberKeyNumeric: { 
    type: Number,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not a valid numeric key'
    }
  },
  memberMlsId: {
    type: String,
    validate: {
      validator: function(v: string | undefined | null) {
        return true  // Accept any string value
      },
      message: 'Invalid MLS ID format'
    }
  },
  fullName: { type: String, required: true },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  officeName: String,
  modificationTimestamp: Date,
  updatedAt: { type: Date, default: Date.now },
  pendingListings: [{
    address: String,
    city: String,
    state: String,
    zipCode: String,
    pendingDate: Date,
    listPrice: Number
  }],
  source: { 
    type: String, 
    enum: Object.values(MLSSource),
    required: true,
    default: MLSSource.SPARK
  },
  sourceId: { 
    type: String, 
    required: true
  },
  association: { 
    type: String, 
    enum: Object.values(MLSAssociation),
    required: true,
    default: MLSAssociation.AAR
  }
})

const mlsListingSchema = new mongoose.Schema({
  listingKey: { type: String, required: true, unique: true },
  listAgentKey: { type: String, required: true },
  mlsStatus: String,
  lifecycleStatus: {
    type: String,
    enum: Object.values(ListingLifecycle),
    default: ListingLifecycle.ACTIVE
  },
  statusHistory: [{
    fromStatus: String,
    toStatus: String,
    changedAt: Date
  }],
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  streetNumberNumeric: String,
  streetName: String,
  city: String,
  stateOrProvince: String,
  listPrice: Number,
  source: { 
    type: String, 
    enum: Object.values(MLSSource),
    required: true,
    default: MLSSource.SPARK
  },
  sourceId: { 
    type: String, 
    required: true
  },
  association: { 
    type: String, 
    enum: Object.values(MLSAssociation),
    required: true,
    default: MLSAssociation.AAR
  },
  standardFields: {
    listPrice: Number,
    city: String,
    stateOrProvince: String,
    postalCode: String,
    standardStatus: String,
    listOfficeName: String,
    bedsTotal: Number,
    bathsTotal: Number,
    buildingAreaTotal: Number,
    yearBuilt: Number,
    propertyType: String,
    propertySubType: String,
    publicRemarks: String
  },
  sourceFields: {
    type: mongoose.Schema.Types.Mixed
  },
  photos: [{
    uri: String,
    isPrimary: Boolean
  }]
})

// Add compound index on source + sourceId
mlsAgentSchema.index({ source: 1, sourceId: 1 }, { unique: true })
mlsListingSchema.index({ source: 1, sourceId: 1 }, { unique: true })

// Add middleware to track status changes
mlsListingSchema.pre('save', function(this: MLSListingDocument) {
  if (this.isModified('mlsStatus')) {
    this.statusHistory.push({
      fromStatus: this._original?.mlsStatus || undefined,
      toStatus: this.mlsStatus || undefined,
      changedAt: new Date()
    })

    // Update lifecycle status
    if (this.mlsStatus === 'Under Contract') {
      this.lifecycleStatus = ListingLifecycle.PENDING
    } else if (this.mlsStatus && ['Sold', 'Expired', 'Withdrawn'].includes(this.mlsStatus)) {
      this.lifecycleStatus = ListingLifecycle.ARCHIVED
      this.isArchived = true
    }
  }
})

// Add indexes
if (!mlsAgentSchema.indexes().find(idx => idx[0].memberKey === 1)) {
  mlsAgentSchema.index({ memberKey: 1 }, { unique: true })
}

if (!mlsListingSchema.indexes().find(idx => idx[0].listAgentKey === 1)) {
  mlsListingSchema.index({ listAgentKey: 1 })
}

if (!mlsListingSchema.indexes().find(idx => idx[0].mlsStatus === 1)) {
  mlsListingSchema.index({ mlsStatus: 1 })
}

if (!mlsAgentSchema.indexes().find(idx => idx[0].memberKeyNumeric === 1)) {
  mlsAgentSchema.index({ memberKeyNumeric: 1 })
}

if (!mlsAgentSchema.indexes().find(idx => idx[0].memberMlsId === 1)) {
  mlsAgentSchema.index({ memberMlsId: 1 })
}

const MLSAgent = mongoose.models.MLSAgent || mongoose.model<MLSAgentDocument>('MLSAgent', mlsAgentSchema)
const MLSListing = mongoose.models.MLSListing || mongoose.model<MLSListingDocument>('MLSListing', mlsListingSchema)

export { MLSAgent, MLSListing } 