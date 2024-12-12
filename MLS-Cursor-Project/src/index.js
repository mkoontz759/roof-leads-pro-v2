require('dotenv').config();

// Add this to verify environment variables are loaded
console.log('Environment check:', {
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasSessionSecret: !!process.env.SESSION_SECRET
});

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const cron = require('node-cron');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./services/LoggerService');
const keepAlive = require('./utils/keep_alive');
const winston = require('winston');
const MongoStore = require('connect-mongo');

// Import routes
const indexRouter = require('./routes/index');
const authRoutes = require('./routes/auth');

// Import services
const DatabaseService = require('./services/DatabaseService');
const WebhookService = require('./services/WebhookService');
const MLSService = require('./services/MLSService');
const { initializeSchedulerService } = require('./services/SchedulerService');

// Import middleware
const { protect } = require('./middleware/auth');

// Initialize express
const app = express();

// Initialize services
const db = new DatabaseService();
const mlsService = new MLSService(logger);
const webhookService = new WebhookService();
const schedulerService = initializeSchedulerService(mlsService, db, webhookService);

// Add these debug logs
console.log('Starting scheduler service...');
schedulerService.startScheduledTasks().then(() => {
    console.log('Scheduler service started, initial sync completed');
    console.log('Last sync time:', schedulerService.getLastSyncTime());
}).catch(error => {
    console.error('Error starting scheduler:', error);
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'your-mongodb-connection-string',
        ttl: 24 * 60 * 60 // Session TTL (1 day)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Flash messages middleware
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.errors = req.flash('error');
  res.locals.successes = req.flash('success');
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes setup
app.get('/', (req, res) => res.redirect('/dashboard'));
app.use('/auth', authRoutes);
app.use('/dashboard', protect, indexRouter);

// Add a catch-all route for undefined routes
app.use('*', (req, res) => {
    res.redirect('/dashboard');
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test MLS route
app.get('/test-mls', async (req, res) => {
  try {
    logger.info('Testing MLS integration...');
    try {
      const metadata = await mlsService.getMetadata();
      logger.info('Metadata received:', { metadata });
    } catch (error) {
      logger.error('MLS test failed:', error);
    }

    const contracts = await mlsService.getNewPendingContracts();
    logger.info(`Found ${contracts.length} pending contracts`);

    logger.debug('Listings data structure:', {
        isArray: Array.isArray(contracts.listings),
        type: typeof contracts.listings,
        keys: contracts.listings ? Object.keys(contracts.listings) : null,
        value: contracts.listings?.value
    });

    const agentInfo = await mlsService.extractAgentInfo(contracts);
    logger.info(`Extracted info for ${agentInfo.length} agents`);

    const savedAgents = await db.saveAgents(agentInfo);
    logger.info(`Saved ${savedAgents.length} agents to database`);

    res.json({
      success: true,
      contracts: contracts.length,
      agents: agentInfo.length,
      saved: savedAgents.length
    });
  } catch (error) {
    logger.error('MLS test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add test webhook route
app.get('/test-webhook/:mlsId', async (req, res) => {
    try {
        const data = await mlsService.getNewPendingContracts();

        // Find the agent with matching MLS ID
        const agent = data.agents.find(a => a.mlsId === req.params.mlsId);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Find matching listing
        const listing = data.listings.find(l => l.listAgentKey === agent.memberKey);
        if (!listing) {
            return res.status(404).json({ error: 'No listing found for agent' });
        }

        // Send to webhook
        await mlsService.sendToLeadConnector({
            ...agent,
            listingInfo: listing
        });

        res.json({ 
            success: true, 
            message: 'Test webhook sent',
            agent: agent.fullName,
            listing: listing.address
        });
    } catch (error) {
        logger.error('Test webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add this new endpoint for manual syncs (add with your other routes)
app.post('/api/sync', protect, async (req, res) => {
    try {
        const result = await schedulerService.manualSync();
        res.json({
            success: true,
            message: 'Manual sync completed',
            result
        });
    } catch (error) {
        logger.error('Manual sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use(errorHandler);

// Start the keep-alive ping
keepAlive();

// Start server with port retry logic
let PORT = process.env.PORT || 3000;
const startServer = (retryCount = 0) => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retryCount < 3) {
      logger.warn(`Port ${PORT} in use, trying ${PORT + 1}`);
      PORT++;
      startServer(retryCount + 1);
    } else {
      logger.error('Server failed to start:', err);
      process.exit(1);
    }
  });
};

startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// After MongoDB connection
logger.info('Testing MLS integration...');
(async () => {
  try {
    const metadata = await mlsService.getMetadata();
    logger.info('MLS endpoints available:', metadata);

    // Get the data
    logger.info('Testing pending contracts fetch...');
    const mlsData = await mlsService.getNewPendingContracts();

    // Store the data
    logger.info('Storing MLS data...');
    const result = await mlsService.storeMLSData(mlsData);
    logger.info('Storage complete:', result);

  } catch (error) {
    logger.error('MLS test failed:', error);
  }
})(); 

// Update these routes to fetch data from your DatabaseService
app.get('/', async (req, res) => {
    try {
        const agents = await db.getAgents();
        const totalAgents = agents.length;
        const todaySyncs = await db.getTodaySyncs();
        const lastSync = await db.getLastSync();

        const stats = {
            totalAgents,
            todaySyncs,
            lastSyncTime: lastSync
        };

        res.render('index', {
            agents,
            stats,
            pagination: {
                current: 1,
                pages: Math.ceil(totalAgents / 12),
                total: totalAgents,
                hasPrev: false,
                hasNext: totalAgents > 12
            },
            view: 'cards'
        });
    } catch (error) {
        logger.error('Error fetching data for cards view:', error);
        res.status(500).render('error', { error: 'Failed to load data' });
    }
});

app.get('/list', async (req, res) => {
    try {
        const agents = await db.getAgents();
        const totalAgents = agents.length;
        const todaySyncs = await db.getTodaySyncs();
        const lastSync = await db.getLastSync();

        const stats = {
            totalAgents,
            todaySyncs,
            lastSyncTime: lastSync
        };

        res.render('list', {
            agents,
            stats,
            pagination: {
                current: 1,
                pages: Math.ceil(totalAgents / 12),
                total: totalAgents,
                hasPrev: false,
                hasNext: totalAgents > 12
            },
            view: 'list'
        });
    } catch (error) {
        logger.error('Error fetching data for list view:', error);
        res.status(500).render('error', { error: 'Failed to load data' });
    }
});

// Update cards redirect to use async/await
app.get('/cards', async (req, res) => {
    res.redirect('/');
}); 

// Add this at the top of your file
const appStartTime = new Date();

// Pass this to your routes
app.use((req, res, next) => {
    res.locals.appStartTime = appStartTime;
    next();
});