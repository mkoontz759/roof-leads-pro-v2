const mongoose = require('mongoose');

// Define a flexible schema that allows any fields
const listingSchema = new mongoose.Schema({}, { strict: false });

// Check if model exists before creating
module.exports = mongoose.models.Listing || mongoose.model('Listing', listingSchema); 