
const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    listingKey: { type: String, required: true, unique: true },
    listPrice: Number,
    listAgentKey: String,
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    modificationTimestamp: Date,
    status: String
}, { 
    timestamps: true,
    strict: false 
});

// Create indexes
listingSchema.index({ listAgentKey: 1 });
listingSchema.index({ modificationTimestamp: -1 });

module.exports = mongoose.models.Listing || mongoose.model('Listing', listingSchema);
