require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Use absolute paths
const DatabaseService = require(path.join(__dirname, '../src/services/DatabaseService'));
const Listing = require(path.join(__dirname, '../src/models/Listing'));

async function geocodeExistingListings() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const dbService = new DatabaseService();

        // Find all listings without coordinates
        const listings = await Listing.find({
            'address.lat': { $exists: false },
            'address.street': { $exists: true }
        });

        console.log(`Found ${listings.length} listings without coordinates`);

        // Process listings in batches to avoid rate limits
        for (const listing of listings) {
            try {
                await dbService.saveListing(listing);
                console.log(`✓ Geocoded listing: ${listing.listingKey} - ${listing.address.street}`);
                // Add a small delay to avoid hitting API rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`✗ Failed to geocode listing ${listing.listingKey}:`, error.message);
            }
        }

        console.log('Geocoding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Script error:', error);
        process.exit(1);
    }
}

geocodeExistingListings();
