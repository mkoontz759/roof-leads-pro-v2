require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

async function testMapData() {
    try {
        // Connect to MongoDB with proper options
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB');

        // Get all listings with coordinates
        const listings = await Listing.find({
            'address.lat': { $exists: true },
            'address.lng': { $exists: true }
        });

        console.log(`Found ${listings.length} listings with coordinates`);
        if (listings.length > 0) {
            console.log('\nSample listing:', listings[0]);
        }

        // Verify statuses
        const statusCounts = await Listing.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log('\nStatus distribution:', statusCounts);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        process.exit();
    }
}

testMapData(); 