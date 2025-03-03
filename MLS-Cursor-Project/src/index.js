require('dotenv').config();

// Environment validation
const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'MONGODB_URI',
    'MLS_CLIENT_ID',
    'MLS_CLIENT_SECRET',
    'MLS_ID',
    'MLS_PASSWORD',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const cron = require('node-cron');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./services/LoggerService');
const keepAlive = require('./utils/keep_alive');
const { protect } = require('./middleware/auth');
const MongoStore = require('connect-mongo');
const passport = require('passport');

// Import routes
const indexRouter = require('./routes/index');
const authRoutes = require('./routes/auth');

// Import services
const DatabaseService = require('./services/DatabaseService');
const WebhookService = require('./services/WebhookService');
const MLSService = require('./services/MLSService');
const { initializeSchedulerService } = require('./services/SchedulerService');

// Initialize express
const app = express();

// Initialize services with error handling
let mlsService, databaseService, webhookService, scheduler;
try {
    mlsService = new MLSService(logger);
    databaseService = new DatabaseService();
    webhookService = new WebhookService();

    // Initialize and start the scheduler
    scheduler = initializeSchedulerService(mlsService, databaseService, webhookService);
    scheduler.startScheduledTasks().catch(err => {
        logger.error('Failed to start scheduler:', err);
    });
} catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
}

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
    try {
        await connectDB();
        logger.info('MongoDB connected successfully');
    } catch (err) {
        logger.error('MongoDB connection error:', err);
        logger.info('Retrying connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};
connectWithRetry();

// Security middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.disable('x-powered-by');

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60,
        autoRemove: 'native',
        touchAfter: 24 * 3600
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict'
    }
};

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));
app.use(flash());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Global variables middleware with error handling
app.use((req, res, next) => {
    try {
        res.locals.user = req.user;
        res.locals.errors = req.flash('error');
        res.locals.successes = req.flash('success');
        next();
    } catch (error) {
        logger.error('Error in globals middleware:', error);
        next(error);
    }
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

// Move debug logging BEFORE routes
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes setup with error boundaries
app.use('/auth', authRoutes);
app.use('/', indexRouter);
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 404 handler BEFORE error handler
app.use((req, res) => {
    console.log('404 for path:', req.path);
    res.status(404).send('Not Found');
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async () => {
    logger.info('Received shutdown signal');
    try {
        // Stop the scheduler
        if (scheduler) {
            await scheduler.stopScheduledTasks();
        }
        // Close MongoDB connection
        await mongoose.connection.close();
        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start keep-alive and server
keepAlive();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    logger.info(`Server accessible at: https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.repl.co`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', error);
    gracefulShutdown();
});

// Schedule future syncs without running immediately
function startScheduledSync() {
    // Schedule future syncs every 15 minutes
    cron.schedule('*/15 * * * *', () => {
        console.log('Running scheduled sync...');
        syncMLS();
    });

    console.log('Scheduled tasks started - running every 15 minutes');
}

// Start the scheduling but don't run sync immediately
startScheduledSync();

// After initializing your services
app.set('mlsService', mlsService);
app.set('databaseService', databaseService);
app.set('webhookService', webhookService);

module.exports = app;
