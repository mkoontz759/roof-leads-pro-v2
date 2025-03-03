require('dotenv').config();
const mongoose = require('mongoose');
const MLSService = require('../services/MLSService');
const logger = require('../services/LoggerService');
const Listing = require('../models/Listing');

async function testMLSSync() {
    try {
        // Connect to MongoDB with proper options
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
            socketTimeoutMS: 45000, // Increase socket timeout
        });
        console.log('Connected to MongoDB');

        const mlsService = new MLSService(logger);

        // 1. Get new listings
        console.log('\nFetching new pending contracts...');
        const data = await mlsService.getNewPendingContracts();
        console.log(`Found ${data.listings.length} pending listings`);
        console.log('Sample listing:', data.listings[0]);

        // 2. Store the data in smaller chunks
        console.log('\nStoring MLS data...');

        // Store agents in chunks of 500
        const agentChunks = chunk(data.agents, 500);
        for (let i = 0; i < agentChunks.length; i++) {
            console.log(`Storing agent chunk ${i + 1} of ${agentChunks.length}...`);
            await mlsService.storeMLSData({ 
                agents: agentChunks[i], 
                listings: i === 0 ? data.listings : [] 
            });
        }

        // 3. Verify database contents
        console.log('\nVerifying database contents...');
        const dbListings = await Listing.find({});
        console.log(`Total listings in database: ${dbListings.length}`);
        if (dbListings.length > 0) {
            console.log('Sample stored listing:', dbListings[0]);
        }

        // 4. Verify all listings are "Under Contract"
        const nonPendingListings = await Listing.find({ status: { $ne: 'Under Contract' } });
        console.log(`\nListings not "Under Contract": ${nonPendingListings.length} (should be 0)`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        process.exit();
    }
}

// Helper function to chunk array
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

testMLSSync(); 