console.log('Loading routes...');

const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const Listing = require('../models/Listing');
const mongoose = require('mongoose');
const logger = require('../services/LoggerService');
const { initializeSchedulerService } = require('../services/SchedulerService');
const MLSService = require('../services/MLSService');
const DatabaseService = require('../services/DatabaseService');
const WebhookService = require('../services/WebhookService');
const auth = require('../middleware/auth');
console.log('Auth middleware loaded:', auth);
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
const DateService = require('../services/DateService');

console.log('About to require listController...');
const listController = require('../controllers/listController');
console.log('listController loaded:', listController);

// Move these to the top of the file with your other requires
const mlsService = new MLSService(require('../services/LoggerService'));
const databaseService = new DatabaseService();
const webhookService = new WebhookService();
const scheduler = initializeSchedulerService(mlsService, databaseService, webhookService);

// Root route
router.get('/', auth.protect, (req, res) => {
    res.redirect('/dashboard');
});

// Dashboard route
router.get('/dashboard', auth.protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const query = req.query.query || '';

        // Get total number of pending transactions
        const totalPendingTransactions = await Listing.countDocuments({});

        const pendingTransactions = await Listing.find({}).lean();
        const agentKeys = [...new Set(pendingTransactions.map(t => t.listAgentKey))].filter(Boolean);

        const agents = await Agent.aggregate([
            {
                $lookup: {
                    from: 'listings',
                    let: { agentKey: '$memberKey' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { 
                                    $eq: ['$listAgentKey', '$$agentKey']
                                }
                            }
                        }
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
                $sort: {
                    'lastSync': -1
                }
            }
        ]);

        console.log('\n=== DEBUG: AGENT SORTING ===');
        console.log('Route:', req.path);
        console.log('Sort field:', req.query.sortField);
        console.log('Sort order:', req.query.sortOrder);
        console.log('\nFirst 5 agents:');
        agents.slice(0, 5).forEach(agent => {
            console.log('----------------------------------------');
            console.log(`Name: ${agent.name?.full || agent.fullName}`);
            console.log(`Last Sync: ${DateService.formatDateTime(agent.lastSync)}`);
        });

        const agentsWithFormattedDates = agents.map(agent => ({
            ...agent,
            formattedLastSync: DateService.formatDateTime(agent.lastSync)
        }));

        const startIndex = (page - 1) * limit;
        const paginatedAgents = agentsWithFormattedDates.slice(startIndex, startIndex + limit);

        res.render('dashboard', {
            title: 'MLS Dashboard',
            view: 'dashboard',
            isAuthenticated: !!req.session.token,
            agents: paginatedAgents,
            query: query,
            sortField: 'lastSync',
            sortOrder: 'desc',
            stats: {
                totalAgents: agents.length,
                todaySyncs: totalPendingTransactions,
                lastSyncTime: scheduler?.getLastSync() || new Date()
            },
            DateService,
            pagination: {
                currentPage: page,
                pages: Math.ceil(agents.length / limit),
                total: agents.length,
                hasNext: (page * limit) < agents.length,
                hasPrev: page > 1
            },
            menuOpen: true,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { message: 'Error loading dashboard', error });
    }
});

// Map routes
router.get('/map', auth.protect, async (req, res) => {
    try {
        // Only get pending listings with coordinates
        const listings = await Listing.find({
            status: 'Pending',
            'address.lat': { $exists: true },
            'address.lng': { $exists: true }
        }).lean();

        const center = listings.reduce((acc, listing) => {
            if (listing.address?.lat && listing.address?.lng) {
                acc.lat += listing.address.lat;
                acc.lng += listing.address.lng;
                acc.count++;
            }
            return acc;
        }, { lat: 0, lng: 0, count: 0 });

        const mapCenter = center.count ? {
            lat: center.lat / center.count,
            lng: center.lng / center.count
        } : { lat: 33.5779, lng: -101.8552 }; // Default to Lubbock center

        res.render('map', {
            title: 'MLS Map View',
            view: 'map',
            isAuthenticated: !!req.session.token,
            mapCenter,
            mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
            menuOpen: true,
        });
    } catch (error) {
        console.error('Map view error:', error);
        res.status(500).render('error', { message: 'Error loading map view', error });
    }
});

router.get('/api/map-data', auth.protect, async (req, res) => {
    try {
        const { dateFilter, priceFilter, zipCodes } = req.query;

        // Build filter object
        const filter = {
            status: 'Pending',
            'address.lat': { $exists: true },
            'address.lng': { $exists: true }
        };

        // Add price filter
        if (priceFilter && priceFilter !== 'all') {
            const [min, max] = priceFilter.split('-').map(Number);
            if (max) {
                filter.listPrice = { $gte: min, $lte: max };
            } else {
                filter.listPrice = { $gte: min };
            }
        }

        // Add date filter
        if (dateFilter && dateFilter !== 'all') {
            const now = new Date();
            let dateLimit;
            switch (dateFilter) {
                case '24h': dateLimit = new Date(now - 24 * 60 * 60 * 1000); break;
                case '5d': dateLimit = new Date(now - 5 * 24 * 60 * 60 * 1000); break;
                case '1w': dateLimit = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
                case '1m': dateLimit = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
            }
            if (dateLimit) {
                filter.lastSync = { $gte: dateLimit };
            }
        }

        // Add zip code filter
        if (zipCodes) {
            const zipCodeArray = zipCodes.split(',');
            filter['address.zip'] = { $in: zipCodeArray };
        }

        const listings = await Listing.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'agents',
                    localField: 'listAgentKey',
                    foreignField: 'memberKey',
                    as: 'agent'
                }
            },
            { $unwind: '$agent' },
            {
                $project: {
                    address: 1,
                    listPrice: 1,
                    mlsNumber: 1,
                    propertyType: 1,
                    bedrooms: 1,
                    bathrooms: 1,
                    squareFootage: 1,
                    yearBuilt: 1,
                    status: 1,
                    lastSync: 1,
                    'agent.name': 1,
                    'agent.email': 1,
                    'agent.phone': 1,
                    'agent.officeName': 1
                }
            }
        ]);

        res.json(listings);
    } catch (error) {
        console.error('Map data error:', error);
        res.status(500).json({ error: 'Error fetching map data' });
    }
});

// List view route
router.get('/list', auth.protect, (req, res, next) => {
    console.log('List route called');
    if (!listController || !listController.listView) {
        console.error('listController or listView is undefined');
        return next(new Error('List view controller not properly initialized'));
    }
    return listController.listView(req, res, next);
});

// Card view route
router.get('/cards', auth.protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const sortField = req.query.sortField || 'lastSync';
        const sortOrder = req.query.sortOrder || 'desc';
        const query = req.query.query || '';
        const dateFilter = req.query.dateFilter || 'all';
        const priceFilter = req.query.priceFilter || 'all';
        const zipCodes = req.query.zipCodes || '';

        // Build sort object
        const sort = {};
        sort[sortField] = sortOrder === 'asc' ? 1 : -1;

        // Build filter query
        const filter = {};
        if (query) {
            filter.$or = [
                { 'fullName': new RegExp(query, 'i') },
                { 'email': new RegExp(query, 'i') },
                { 'phone': new RegExp(query, 'i') },
                { 'officeName': new RegExp(query, 'i') }
            ];
        }

        const agents = await Agent.aggregate([
            {
                $lookup: {
                    from: 'listings',
                    localField: 'memberKey',
                    foreignField: 'listAgentKey',
                    as: 'listings'
                }
            },
            {
                $match: {
                    ...filter,
                    'listings.0': { $exists: true }
                }
            },
            {
                $sort: sort
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: limit
            },
            {
                $addFields: {
                    listingCount: { $size: "$listings" }
                }
            }
        ]);

        const total = await Agent.countDocuments(filter);

        res.render('cards', {
            title: 'Agent Cards',
            view: 'cards',
            isAuthenticated: !!req.session.token,
            agents,
            query,
            sortField,
            sortOrder,
            limit,
            dateFilter,
            priceFilter,
            zipCodes,
            DateService,
            pagination: {
                currentPage: page,
                pages: Math.ceil(total / limit),
                total,
                hasNext: (page * limit) < total,
                hasPrev: page > 1
            },
            menuOpen: true,
        });
    } catch (error) {
        console.error('Card view error:', error);
        res.status(500).render('error', { message: 'Error loading card view', error });
    }
});

// Debug routes
router.get('/debug-data', auth.protect, async (req, res) => {
    try {
        const listings = await Listing.find().limit(5).lean();
        const agents = await Agent.find().limit(5).lean();
        res.json({
            listings: listings,
            agents: agents,
            listingCount: await Listing.countDocuments(),
            agentCount: await Agent.countDocuments()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/debug-agents', auth.protect, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const agentsCollection = db.collection('agents');
        const listingsCollection = db.collection('listings');

        const sampleListings = await listingsCollection.find({}).limit(5).toArray();
        const sampleAgentKeys = sampleListings.map(l => l.listAgentKey);

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

router.get('/download-csv', auth.protect, async (req, res) => {
    try {
        // Fetch all agents with their listings
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
                                    $eq: ['$listAgentKey', '$$agentKey']
                                }
                            }
                        }
                    ],
                    as: 'listings'
                }
            },
            {
                $match: {
                    'listings.0': { $exists: true }
                }
            }
        ]);

        // Format data for CSV
        const csvData = agents.flatMap(agent => 
            agent.listings.map(listing => ({
                agentName: agent.name?.full || agent.fullName,
                agentEmail: agent.email,
                agentPhone: agent.phone,
                officeName: agent.officeName,
                mlsNumber: listing.mlsNumber,
                propertyAddress: `${listing.address?.street}, ${listing.address?.city}, ${listing.address?.state} ${listing.address?.zip}`,
                listPrice: listing.listPrice ? `$${listing.listPrice.toLocaleString()}` : 'N/A',
                closePrice: listing.closePrice ? `$${listing.closePrice.toLocaleString()}` : 'N/A',
                propertyType: listing.propertyType,
                bedrooms: listing.bedrooms,
                bathrooms: listing.bathrooms,
                squareFootage: listing.squareFootage,
                yearBuilt: listing.yearBuilt,
                lastUpdated: DateService.formatDateTime(agent.lastSync)
            }))
        );

        // Create CSV stringifier
        const csvStringifier = createCsvStringifier({
            header: [
                { id: 'agentName', title: 'Agent Name' },
                { id: 'agentEmail', title: 'Email' },
                { id: 'agentPhone', title: 'Phone' },
                { id: 'officeName', title: 'Office' },
                { id: 'mlsNumber', title: 'MLS#' },
                { id: 'propertyAddress', title: 'Property Address' },
                { id: 'listPrice', title: 'List Price' },
                { id: 'closePrice', title: 'Close Price' },
                { id: 'propertyType', title: 'Property Type' },
                { id: 'bedrooms', title: 'Beds' },
                { id: 'bathrooms', title: 'Baths' },
                { id: 'squareFootage', title: 'SqFt' },
                { id: 'yearBuilt', title: 'Year Built' },
                { id: 'lastUpdated', title: 'Last Updated' }
            ]
        });

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=mls-data.csv');

        // Write CSV content
        res.write(csvStringifier.getHeaderString());
        res.write(csvStringifier.stringifyRecords(csvData));
        res.end();

    } catch (error) {
        console.error('CSV download error:', error);
        res.status(500).send('Error generating CSV file');
    }
});

router.get('/api/zip-codes', auth.protect, async (req, res) => {
    try {
        const zipCodes = await Listing.aggregate([
            {
                $group: {
                    _id: "$address.zip",
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    "_id": { $ne: null }  // Filter out null zip codes
                }
            },
            {
                $sort: { "_id": 1 }  // Sort zip codes numerically
            },
            {
                $project: {
                    zip: "$_id",
                    count: 1,
                    _id: 0
                }
            }
        ]);

        res.json(zipCodes);
    } catch (error) {
        console.error('Error fetching zip codes:', error);
        res.status(500).json({ error: 'Failed to fetch zip codes' });
    }
});

router.get('/api/cards-data', auth.protect, async (req, res) => {
    try {
        console.log('Starting cards-data request with params:', req.query);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const priceFilter = req.query.priceFilter || 'all';
        const dateFilter = req.query.dateFilter || 'all';

        // Build aggregation pipeline
        const pipeline = [
            {
                $lookup: {
                    from: 'listings',
                    localField: 'memberKey',
                    foreignField: 'listAgentKey',
                    as: 'listings'
                }
            },
            {
                $match: {
                    'listings.0': { $exists: true }
                }
            }
        ];

        const agents = await Agent.aggregate(pipeline);
        console.log(`Found ${agents.length} agents before filtering`);

        // Apply filters in memory
        let filteredAgents = agents;

        // Price filter
        if (priceFilter !== 'all') {
            const [min, max] = priceFilter.split('-').map(Number);
            filteredAgents = filteredAgents.filter(agent => 
                agent.listings.some(listing => {
                    const price = listing.listPrice || 0;
                    if (max) {
                        return price >= min && price <= max;
                    }
                    return price >= min;
                })
            );
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            let dateLimit;
            switch (dateFilter) {
                case '24h': dateLimit = new Date(now - 24 * 60 * 60 * 1000); break;
                case '5d': dateLimit = new Date(now - 5 * 24 * 60 * 60 * 1000); break;
                case '1w': dateLimit = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
                case '1m': dateLimit = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
            }
            if (dateLimit) {
                filteredAgents = filteredAgents.filter(agent => 
                    new Date(agent.lastSync) >= dateLimit
                );
            }
        }

        console.log(`After filtering: ${filteredAgents.length} agents`);

        // Paginate
        const startIndex = (page - 1) * limit;
        const paginatedAgents = filteredAgents.slice(startIndex, startIndex + limit);

        // Add debug logging
        const templatePath = path.join(__dirname, '../../src/views/partials/agent-cards.ejs');
        console.log('Template path:', templatePath);
        console.log('Current directory:', __dirname);

        // Try to check if file exists
        const fs = require('fs');
        if (fs.existsSync(templatePath)) {
            console.log('Template file exists!');
        } else {
            console.log('Template file not found!');
        }

        const cardsHtml = await ejs.renderFile(
            templatePath,
            { agents: paginatedAgents }
        );

        const totalPages = Math.ceil(filteredAgents.length / limit);
        const paginationHtml = `
            <div class="pagination">
                ${page > 1 ? `<a href="#" data-page="${page-1}" class="page-link">&laquo; Previous</a>` : ''}
                ${Array.from({length: totalPages}, (_, i) => i + 1)
                    .map(p => `<a href="#" data-page="${p}" class="page-link ${p === page ? 'active' : ''}">${p}</a>`)
                    .join('')}
                ${page < totalPages ? `<a href="#" data-page="${page+1}" class="page-link">Next &raquo;</a>` : ''}
            </div>
        `;

        console.log('Sending response');
        res.json({
            cards: cardsHtml,
            pagination: paginationHtml,
            total: filteredAgents.length
        });

    } catch (error) {
        console.error('API error:', error);
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            path: error.path
        });
        res.status(500).json({ 
            error: 'Failed to fetch filtered data', 
            details: error.message 
        });
    }
});

module.exports = router;
