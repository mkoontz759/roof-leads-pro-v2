const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const Listing = require('../models/Listing');
const logger = require('../services/LoggerService');
require('dotenv').config();

async function migrateDateFields() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('Connected to MongoDB');

        // Migrate Agent documents
        logger.info('Starting Agent migration...');
        const agentResult = await Agent.updateMany(
            { lastUpdated: { $exists: true } },
            [
                {
                    $set: {
                        lastSync: {
                            $cond: {
                                if: { $gt: ["$lastUpdated", "$lastSync"] },
                                then: "$lastUpdated",
                                else: "$lastSync"
                            }
                        }
                    }
                },
                {
                    $unset: "lastUpdated"
                }
            ]
        );
        logger.info(`Updated ${agentResult.modifiedCount} Agent documents`);

        // Migrate Listing documents
        logger.info('Starting Listing migration...');
        const listingResult = await Listing.updateMany(
            { modificationTimestamp: { $exists: true } },
            [
                {
                    $set: {
                        lastSync: {
                            $cond: {
                                if: { $gt: ["$modificationTimestamp", "$lastSync"] },
                                then: "$modificationTimestamp",
                                else: "$lastSync"
                            }
                        }
                    }
                },
                {
                    $unset: "modificationTimestamp"
                }
            ]
        );
        logger.info(`Updated ${listingResult.modifiedCount} Listing documents`);

        // Verify migrations
        const agentsWithOldField = await Agent.countDocuments({ lastUpdated: { $exists: true } });
        const listingsWithOldField = await Listing.countDocuments({ modificationTimestamp: { $exists: true } });

        if (agentsWithOldField === 0 && listingsWithOldField === 0) {
            logger.info('Migration completed successfully');
        } else {
            logger.warn('Some documents still have old fields:', {
                agentsWithOldField,
                listingsWithOldField
            });
        }

    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

// Run migration if script is executed directly
if (require.main === module) {
    migrateDateFields()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = migrateDateFields; 