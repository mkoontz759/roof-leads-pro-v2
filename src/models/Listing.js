const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    listingKey: { 
        type: String, 
        required: true, 
        unique: true 
    },
    listPrice: Number,
    listAgentKey: String,
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        lat: Number,
        lng: Number
    },
    lastSync: {
        type: Date,
        default: Date.now
    },
    status: String
}, { 
    timestamps: true,
    strict: false 
});

listingSchema.index({ listAgentKey: 1 });
listingSchema.index({ lastSync: -1 });

module.exports = mongoose.models.Listing || mongoose.model('Listing', listingSchema);
