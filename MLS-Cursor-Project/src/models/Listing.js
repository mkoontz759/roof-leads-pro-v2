const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    listingKey: {
        type: String,
        required: true,
        unique: true
    },
    listPrice: {
        type: Number,
        required: true
    },
    listAgentKey: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'Under Contract',
        enum: ['Under Contract']
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        lat: Number,
        lng: Number
    },
    modificationTimestamp: {
        type: Date,
        required: true
    },
    lastSync: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
listingSchema.index({ 'address.lat': 1, 'address.lng': 1 });
listingSchema.index({ status: 1, isActive: 1 });

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing; 