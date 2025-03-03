console.log('Loading listController...');
const Agent = require('../models/Agent');
const DateService = require('../services/DateService');

console.log('Dependencies loaded in listController');

async function listView(req, res) {
    console.log('listView function called');
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 24;
        const sortField = req.query.sortField || 'lastSync';
        const sortOrder = req.query.sortOrder || 'desc';
        const query = req.query.query || '';

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

        // Modified aggregation pipeline to properly join with listings
        const agents = await Agent.aggregate([
            {
                $lookup: {
                    from: 'listings',
                    let: { agentKey: '$memberKey' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$listAgentKey', '$$agentKey'] }
                            }
                        }
                    ],
                    as: 'listings'
                }
            },
            {
                $match: {
                    ...filter,
                    'listings.0': { $exists: true } // Only agents with listings
                }
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    fullName: 1,
                    email: 1,
                    phone: 1,
                    officeName: 1,
                    lastSync: 1,
                    listings: 1,
                    name: {
                        full: { 
                            $ifNull: [
                                '$fullName', 
                                { $concat: [
                                    { $ifNull: ['$firstName', ''] }, 
                                    ' ', 
                                    { $ifNull: ['$lastName', ''] }
                                ]}
                            ]
                        }
                    }
                }
            },
            { $sort: sort },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]);

        // Get total count for pagination
        const total = await Agent.aggregate([
            {
                $lookup: {
                    from: 'listings',
                    let: { agentKey: '$memberKey' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$listAgentKey', '$$agentKey'] }
                            }
                        }
                    ],
                    as: 'listings'
                }
            },
            {
                $match: {
                    ...filter,
                    'listings.0': { $exists: true }
                }
            },
            { $count: 'total' }
        ]);

        const totalCount = total[0]?.total || 0;

        res.render('list', {
            title: 'Agent List',
            view: 'list',
            isAuthenticated: !!req.session.token,
            agents,
            query,
            sortField,
            sortOrder,
            limit,
            DateService,
            pagination: {
                currentPage: page,
                pages: Math.ceil(totalCount / limit),
                total: totalCount,
                hasNext: (page * limit) < totalCount,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('List view error:', error);
        res.status(500).render('error', { message: 'Error loading list view', error });
    }
}

console.log('About to export listController');

module.exports = {
    listView
};

console.log('listController exported:', module.exports); 