const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const Listing = require('../models/Listing');
const mongoose = require('mongoose');
const logger = require('../services/LoggerService');
const { getSchedulerService } = require('../services/SchedulerService');
const { protect } = require('../middleware/auth');

function formatCentralTime(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';

        return date.toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'N/A';
    }
}

// Separate the root and dashboard routes
router.get('/', protect, (req, res) => {
    res.redirect('/dashboard');
});

router.get('/dashboard', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const query = req.query.query || '';

        // Get pending transactions first
        const pendingTransactions = await Listing.find({}).lean();
        const agentKeys = [...new Set(pendingTransactions.map(t => t.listAgentKey))].filter(Boolean);

        // Get agents with their pending listings
        const agents = await Agent.aggregate([
            {
                $match: {
                    memberKey: { $in: agentKeys }
                }
            },
            {
                $lookup: {
                    from: 'listings',
                    let: { agentKey: '$memberKey' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { 
                                    $and: [
                                        { $eq: ['$listAgentKey', '$$agentKey'] },
                                        { $eq: ['$status', 'Pending'] }
                                    ]
                                }
                            }
                        },
                        // Sort the listings by modification timestamp
                        { $sort: { modificationTimestamp: -1 } }
                    ],
                    as: 'listings'
                }
            },
            {
                $match: {
                    'listings.0': { $exists: true }
                }
            },
            // Sort the agents by their most recent listing's timestamp
            {
                $addFields: {
                    mostRecentListingDate: {
                        $max: '$listings.modificationTimestamp'
                    }
                }
            },
            {
                $sort: {
                    mostRecentListingDate: -1,
                    lastUpdated: -1
                }
            }
        ]);

        // Format dates and apply pagination
        const agentsWithFormattedDates = agents.map(agent => ({
            ...agent,
            formattedLastUpdated: formatCentralTime(agent.lastUpdated)
        }));

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const paginatedAgents = agentsWithFormattedDates.slice(startIndex, startIndex + limit);

        const scheduler = getSchedulerService();

        res.render('dashboard', {
            title: 'MLS Dashboard',
            view: 'dashboard',
            isAuthenticated: !!req.session.token,
            agents: paginatedAgents,
            query: query,
            sortField: 'lastUpdated',
            sortOrder: 'desc',
            stats: {
                totalAgents: agents.length,
                todaySyncs: agents.length,
                lastSyncTime: scheduler?.getLastSyncTime() || new Date()
            },
            pagination: {
                currentPage: page,
                pages: Math.ceil(agents.length / limit),
                total: agents.length,
                hasNext: (page * limit) < agents.length,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { message: 'Error loading dashboard', error });
    }
});

router.get('/debug-agents', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const agentsCollection = db.collection('agents');

        // Get a sample of agent keys from listings
        const listingsCollection = db.collection('listings');
        const sampleListings = await listingsCollection.find({}).limit(5).toArray();
        const sampleAgentKeys = sampleListings.map(l => l.listAgentKey);

        // Direct query to check agents
        const agentCount = await agentsCollection.countDocuments();
        const matchingAgents = await agentsCollection.find({
            memberKey: { $in: sampleAgentKeys }
        }).toArray();

        res.json({
            totalAgentsInDB: agentCount,
            sampleAgentKeys: sampleAgentKeys,
            matchingAgentsFound: matchingAgents.length,
            sampleAgents: matchingAgents.map(a => ({
                memberKey: a.memberKey,
                name: a.name || a.fullName
            }))
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this temporary debug route
router.get('/debug-keys', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const listingsCollection = db.collection('listings');
        const agentsCollection = db.collection('agents');

        // Get a sample of listings with their agent keys
        const listings = await listingsCollection.find({})
            .limit(20)
            .toArray();

        const listingKeys = listings.map(l => ({
            listAgentKey: l.listAgentKey,
            address: l.address?.street
        }));

        // Try to find matching agents
        const agents = await agentsCollection.find({
            memberKey: { $in: listingKeys.map(l => l.listAgentKey) }
        }).toArray();

        const agentKeys = agents.map(a => ({
            memberKey: a.memberKey,
            name: a.name?.full || a.fullName
        }));

        res.json({
            listingSample: listingKeys,
            matchingAgents: agentKeys,
            analysis: {
                totalListings: listings.length,
                uniqueListingKeys: [...new Set(listingKeys.map(l => l.listAgentKey))].length,
                matchingAgents: agents.length,
                possibleMismatch: true
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this temporary debug route
router.get('/debug-db', async (req, res) => {
    try {
        const agentsCollection = mongoose.connection.collection('agents');
        const listingsCollection = mongoose.connection.collection('listings');

        const agentCount = await agentsCollection.countDocuments();
        const listingCount = await listingsCollection.countDocuments();

        const sampleAgents = await agentsCollection.find().limit(5).toArray();
        const sampleListings = await listingsCollection.find().limit(5).toArray();

        res.json({
            counts: {
                agents: agentCount,
                listings: listingCount
            },
            samples: {
                agents: sampleAgents,
                listings: sampleListings
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/cards', protect, async (req, res) => {
    console.log('Hitting /cards route');
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const query = req.query.query || '';

        // Use the same agent fetching logic as your dashboard route
        const pendingTransactions = await Listing.find({}).lean();
        const agentKeys = [...new Set(pendingTransactions.map(t => t.listAgentKey))].filter(Boolean);

        const agents = await Agent.aggregate([
            {
                $match: {
                    memberKey: { $in: agentKeys }
                }
            },
            {
                $lookup: {
                    from: 'listings',
                    let: { agentKey: '$memberKey' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { 
                                    $and: [
                                        { $eq: ['$listAgentKey', '$$agentKey'] },
                                        { $eq: ['$status', 'Pending'] }
                                    ]
                                }
                            }
                        },
                        { $sort: { modificationTimestamp: -1 } }
                    ],
                    as: 'listings'
                }
            },
            {
                $match: {
                    'listings.0': { $exists: true }
                }
            },
            {
                $addFields: {
                    mostRecentListingDate: {
                        $max: '$listings.modificationTimestamp'
                    }
                }
            },
            {
                $sort: {
                    mostRecentListingDate: -1,
                    lastUpdated: -1
                }
            }
        ]);

        const agentsWithFormattedDates = agents.map(agent => ({
            ...agent,
            formattedLastUpdated: formatCentralTime(agent.lastUpdated)
        }));

        const startIndex = (page - 1) * limit;
        const paginatedAgents = agentsWithFormattedDates.slice(startIndex, startIndex + limit);

        const scheduler = getSchedulerService();

        res.render('cards', {
            title: 'MLS Cards View',
            view: 'cards',
            isAuthenticated: !!req.session.token,
            agents: paginatedAgents,
            query: query,
            sortField: 'lastUpdated',
            sortOrder: 'desc',
            stats: {
                totalAgents: agents.length,
                todaySyncs: agents.length,
                lastSyncTime: scheduler?.getLastSyncTime() || new Date()
            },
            pagination: {
                currentPage: page,
                pages: Math.ceil(agents.length / limit),
                total: agents.length,
                hasNext: (page * limit) < agents.length,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Cards view error:', error);
        res.status(500).render('error', { message: 'Error loading cards view', error });
    }
});

module.exports = router; 